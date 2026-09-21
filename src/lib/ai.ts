import Anthropic from "@anthropic-ai/sdk";
import { startOfDay, startOfMonth, startOfWeek, startOfYear } from "date-fns";
import { prisma } from "@/lib/db";
import { getUserFinanceSnapshot, getGroupTransfers } from "@/lib/finance";
import { formatBRL } from "@/lib/format";

export const financeTools: Anthropic.Tool[] = [
  {
    name: "get_monthly_summary",
    description:
      "Resumo financeiro do usuário logado: saldo, entradas, despesas, contas pendentes, cartões, dívidas e grupos.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "get_expenses_by_category",
    description: "Gastos do mês agrupados por categoria.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "get_transactions",
    description: "Lista lançamentos do usuário. Nunca retorna dados de outras pessoas.",
    input_schema: {
      type: "object",
      properties: {
        type: { type: "string", enum: ["income", "expense"] },
        category: { type: "string", description: "Nome da categoria, ex: Mercado" },
        period: { type: "string", enum: ["day", "week", "month", "year"] },
        limit: { type: "number" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_bills",
    description: "Contas a pagar do usuário.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "get_cards",
    description: "Cartões e faturas do usuário.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "get_debts",
    description: "Dívidas pessoais do usuário.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "get_group_balances",
    description: "Saldos simplificados dos grupos do usuário (quem deve para quem), sem extrato pessoal de terceiros.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
];

function periodStart(period?: string) {
  const now = new Date();
  if (period === "day") return startOfDay(now);
  if (period === "week") return startOfWeek(now, { weekStartsOn: 1 });
  if (period === "year") return startOfYear(now);
  return startOfMonth(now);
}

export async function runFinanceTool(
  userId: string,
  name: string,
  input: Record<string, unknown>,
) {
  const snapshot = await getUserFinanceSnapshot(userId);

  if (name === "get_monthly_summary") return snapshot;
  if (name === "get_expenses_by_category") return snapshot.byCategory;
  if (name === "get_bills") return snapshot.bills;
  if (name === "get_cards") return snapshot.cards;
  if (name === "get_debts") return snapshot.debts;

  if (name === "get_group_balances") {
    const memberships = await prisma.groupMember.findMany({
      where: { userId },
      include: { group: true },
    });
    const groups = [];
    for (const m of memberships) {
      groups.push({
        group: m.group.name,
        transfers: await getGroupTransfers(m.groupId),
        myNet: snapshot.groups.find((g) => g.id === m.groupId)?.net ?? 0,
      });
    }
    return groups;
  }

  if (name === "get_transactions") {
    const type = typeof input.type === "string" ? input.type : undefined;
    const category = typeof input.category === "string" ? input.category : undefined;
    const period = typeof input.period === "string" ? input.period : "month";
    const limit = typeof input.limit === "number" ? input.limit : 30;
    const txs = await prisma.transaction.findMany({
      where: {
        userId,
        type,
        date: { gte: periodStart(period) },
        ...(category
          ? { category: { name: { contains: category, mode: "insensitive" } } }
          : {}),
      },
      include: { category: true },
      orderBy: { date: "desc" },
      take: Math.min(limit, 50),
    });
    return {
      total: txs.reduce((acc, t) => acc + t.amount, 0),
      items: txs.map((t) => ({
        date: t.date.toISOString().slice(0, 10),
        type: t.type,
        description: t.description,
        category: t.category?.name ?? null,
        amount: t.amount,
      })),
    };
  }

  return { error: "Ferramenta desconhecida" };
}

export async function answerWithClaude(
  userId: string,
  history: { role: "user" | "assistant"; content: string }[],
  message: string,
) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const messages: Anthropic.MessageParam[] = [
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: message },
  ];

  let response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1600,
    system: `Você é o assistente financeiro do app Financias. Fale em português do Brasil, de forma clara e objetiva.
Use as ferramentas para consultar apenas os dados do usuário logado.
Nunca invente valores. Nunca peça ou revele extrato pessoal de outras pessoas; saldo de grupo é permitido.
Valores das ferramentas estão em centavos (divida por 100 para reais).
Se a pergunta for sobre gastar um valor, compare com o quanto ainda sobra no mês.`,
    tools: financeTools,
    messages,
  });

  for (let i = 0; i < 5; i += 1) {
    const toolUses = response.content.filter((b) => b.type === "tool_use");
    if (response.stop_reason !== "tool_use" || toolUses.length === 0) break;

    const toolResults: Anthropic.MessageParam = {
      role: "user",
      content: await Promise.all(
        toolUses.map(async (block) => {
          const result = await runFinanceTool(
            userId,
            block.name,
            (block.input as Record<string, unknown>) ?? {},
          );
          return {
            type: "tool_result" as const,
            tool_use_id: block.id,
            content: JSON.stringify(result),
          };
        }),
      ),
    };

    messages.push({ role: "assistant", content: response.content });
    messages.push(toolResults);

    response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1600,
      system: `Você é o assistente financeiro do app Financias. Fale em português do Brasil. Valores em centavos devem ser convertidos para reais.`,
      tools: financeTools,
      messages,
    });
  }

  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
  return text || "Não consegui gerar uma resposta agora.";
}

export async function answerLocally(userId: string, message: string) {
  const q = message.toLowerCase();
  const snapshot = await getUserFinanceSnapshot(userId);
  const want = q.match(/r\$\s*([\d.,]+)/) || q.match(/(\d+[\d.,]*)\s*reais/);

  if (q.includes("resumo") || q.includes("situação") || q.includes("situacao")) {
    return [
      `Resumo do mês:`,
      `• Saldo disponível: ${formatBRL(snapshot.available)}`,
      `• Investido: ${formatBRL(snapshot.invested)}`,
      `• Entradas: ${formatBRL(snapshot.income)}`,
      `• Despesas: ${formatBRL(snapshot.expenses)}`,
      `• Contas pendentes: ${formatBRL(snapshot.pendingBills)}`,
      `• Cartões: ${formatBRL(snapshot.cardDebt)}`,
      `• Quanto sobra: ${formatBRL(snapshot.leftover)}`,
    ].join("\n");
  }

  if (q.includes("mercado") || q.includes("alimentação") || q.includes("alimentacao") || snapshot.byCategory.some((c) => q.includes(c.name.toLowerCase()))) {
    const match =
      snapshot.byCategory.find((c) => q.includes(c.name.toLowerCase())) ??
      snapshot.byCategory.find((c) => c.name === "Mercado");
    if (match) {
      return `Você gastou ${formatBRL(match.amount)} com ${match.name} neste mês.`;
    }
  }

  if (q.includes("categoria") || q.includes("mais gastei") || q.includes("maior gasto")) {
    const top = snapshot.byCategory[0];
    if (!top) return "Ainda não há gastos categorizados neste mês.";
    return `A categoria com maior gasto no mês é ${top.name}, com ${formatBRL(top.amount)}.`;
  }

  if (want && (q.includes("posso gastar") || q.includes("posso gastar") || q.includes("fim de semana"))) {
    const cents = Math.round(Number(want[1].replace(/\./g, "").replace(",", ".")) * 100);
    if (snapshot.leftover >= cents) {
      return `Sim. Depois desse gasto de ${formatBRL(cents)}, ainda restariam cerca de ${formatBRL(snapshot.leftover - cents)} no mês (entradas menos despesas e contas pendentes).`;
    }
    return `Fica apertado. Você tem ${formatBRL(snapshot.leftover)} projetados para sobrar, o que é menos que ${formatBRL(cents)}.`;
  }

  if (q.includes("conta") || q.includes("venc")) {
    const pending = snapshot.bills.filter((b) => b.status === "pending");
    if (pending.length === 0) return "Não há contas pendentes.";
    return pending
      .map((b) => `• ${b.name}: ${formatBRL(b.amount)} (vence ${b.dueDate.slice(0, 10).split("-").reverse().join("/")})`)
      .join("\n");
  }

  if (q.includes("cartão") || q.includes("cartao") || q.includes("fatura")) {
    if (snapshot.cards.length === 0) return "Você ainda não cadastrou cartões.";
    return snapshot.cards
      .map((c) => `• ${c.name}: fatura atual ${formatBRL(c.currentInvoice)} · limite disponível ${formatBRL(c.available)}`)
      .join("\n");
  }

  if (q.includes("dívida") || q.includes("divida")) {
    if (snapshot.debts.length === 0) return "Nenhuma dívida cadastrada.";
    return snapshot.debts
      .map((d) => `• ${d.creditor}: falta ${formatBRL(d.remaining)} de ${formatBRL(d.totalAmount)}`)
      .join("\n");
  }

  if (q.includes("grupo") || q.includes("devo") || q.includes("deve")) {
    if (snapshot.groups.length === 0) return "Você ainda não participa de grupos.";
    return snapshot.groups
      .map((g) => {
        if (g.net > 1) return `• ${g.name}: você tem ${formatBRL(g.net)} a receber`;
        if (g.net < -1) return `• ${g.name}: você deve ${formatBRL(-g.net)}`;
        return `• ${g.name}: contas quitadas`;
      })
      .join("\n");
  }

  if (q.includes("gastei") || q.includes("despesa") || q.includes("gasto")) {
    return `Despesas de hoje ${formatBRL(snapshot.todayExpenses)}, da semana ${formatBRL(snapshot.weekExpenses)} e do mês ${formatBRL(snapshot.expenses)}.`;
  }

  if (q.includes("entrada") || q.includes("salário") || q.includes("salario") || q.includes("recebi")) {
    return `Entradas do mês: ${formatBRL(snapshot.income)}.`;
  }

  if (q.includes("cort") || q.includes("econom") || q.includes("meta")) {
    const top = snapshot.byCategory.slice(0, 3);
    if (top.length === 0) return "Cadastre alguns gastos para eu sugerir cortes.";
    const suggestion = top
      .map((c) => `• ${c.name}: ${formatBRL(c.amount)} — vale revisar 10% (${formatBRL(Math.round(c.amount * 0.1))})`)
      .join("\n");
    return `Sugestão de economia nas maiores categorias:\n${suggestion}`;
  }

  return [
    `Saldo ${formatBRL(snapshot.available)} · entradas ${formatBRL(snapshot.income)} · despesas ${formatBRL(snapshot.expenses)} · sobra ${formatBRL(snapshot.leftover)}.`,
    `Pergunte, por exemplo: "quanto gastei com mercado esse mês?" ou "posso gastar R$200 esse fim de semana?".`,
  ].join("\n");
}
