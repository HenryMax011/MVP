import { getUserFinanceSnapshot } from "@/lib/finance";
import { formatBRL } from "@/lib/format";

export function geminiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

function resolveGeminiModel() {
  return process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
}

function toGeminiContents(
  history: { role: "user" | "assistant"; content: string }[],
  message: string,
) {
  const items = [
    ...history.slice(-8).map((m) => ({
      role: m.role === "assistant" ? ("model" as const) : ("user" as const),
      parts: [{ text: m.content }],
    })),
    { role: "user" as const, parts: [{ text: message }] },
  ];
  const merged: { role: "user" | "model"; parts: { text: string }[] }[] = [];
  for (const item of items) {
    const last = merged[merged.length - 1];
    if (last && last.role === item.role) {
      last.parts[0].text += `\n${item.parts[0].text}`;
    } else {
      merged.push({ role: item.role, parts: [{ text: item.parts[0].text }] });
    }
  }
  return merged;
}

function snapshotPrompt(snapshot: Awaited<ReturnType<typeof getUserFinanceSnapshot>>) {
  const pending = snapshot.bills.filter((b) => b.status === "pending");
  const categories = snapshot.byCategory
    .slice(0, 6)
    .map((c) => `${c.name} ${formatBRL(c.amount)}`)
    .join(", ");
  const debts = snapshot.debts
    .map((d) => `${d.creditor} falta ${formatBRL(d.remaining)}`)
    .join("; ");
  return `Você é o assistente financeiro do app MVP Finanças. Fale em português do Brasil, curto e claro.
Use SOMENTE estes dados reais do usuário. Nunca invente valor. Se não estiver abaixo, diga que não tem o dado.

Dados agora:
- Saldo na carteira: ${formatBRL(snapshot.available)}
- Investido: ${formatBRL(snapshot.invested)}
- Entradas do período: ${formatBRL(snapshot.income)}
- Despesas do período: ${formatBRL(snapshot.expenses)}
- Sobra (entradas − despesas): ${formatBRL(snapshot.leftover)}
- Gastou hoje: ${formatBRL(snapshot.todayExpenses)}
- Gastou na semana: ${formatBRL(snapshot.weekExpenses)}
- Contas pendentes: ${pending.length === 0 ? "nenhuma" : pending.map((b) => `${b.name} ${formatBRL(b.amount)}`).join(", ")}
- Cartões: ${snapshot.cards.length === 0 ? "nenhum" : snapshot.cards.map((c) => `${c.name} fatura ${formatBRL(c.currentInvoice)}`).join(", ")}
- Dívidas: ${debts || "nenhuma"}
- Maiores gastos: ${categories || "ainda sem categoria"}
- Grupos: ${
    snapshot.groups.length === 0
      ? "nenhum"
      : snapshot.groups.map((g) => `${g.name} ${g.net >= 0 ? "a receber" : "você deve"} ${formatBRL(Math.abs(g.net))}`).join(", ")
  }

Se perguntarem se cabe um gasto, compare com a sobra.`;
}

export async function answerWithGemini(
  userId: string,
  history: { role: "user" | "assistant"; content: string }[],
  message: string,
) {
  const snapshot = await getUserFinanceSnapshot(userId);
  const apiKey = process.env.GEMINI_API_KEY!.trim();
  const model = resolveGeminiModel();
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: snapshotPrompt(snapshot) }] },
        contents: toGeminiContents(history, message),
        generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
      }),
    },
  );
  const data = (await res.json().catch(() => null)) as {
    error?: { message?: string };
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  } | null;
  if (!res.ok) {
    throw new Error(data?.error?.message || `Gemini ${res.status}`);
  }
  const text = data?.candidates?.[0]?.content?.parts
    ?.map((p) => p.text ?? "")
    .join("")
    .trim();
  return text || "Não consegui gerar uma resposta agora.";
}

export async function answerAssistant(
  userId: string,
  history: { role: "user" | "assistant"; content: string }[],
  message: string,
) {
  if (!geminiConfigured()) {
    return {
      reply: "O assistente usa só o Gemini. Defina GEMINI_API_KEY no .env e na Vercel.",
      provider: "gemini" as const,
    };
  }
  try {
    return { reply: await answerWithGemini(userId, history, message), provider: "gemini" as const };
  } catch {
    return {
      reply: "Não consegui falar com o Gemini agora. Tente de novo em instantes.",
      provider: "gemini" as const,
    };
  }
}
