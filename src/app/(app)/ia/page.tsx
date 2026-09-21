import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Chat } from "@/components/chat";

export default async function IaPage() {
  const session = await requireSession();
  const conversation = await prisma.conversation.findFirst({
    where: { userId: session.userId },
    include: { messages: { orderBy: { createdAt: "asc" }, take: 40 } },
  });

  return (
    <div className="grid gap-3">
      <div>
        <h1 className="text-2xl font-semibold">Assistente</h1>
        <p className="text-sm text-muted">
          Consulta só os seus dados. Saldos de grupo entram; extrato de outras pessoas, não.
          {process.env.ANTHROPIC_API_KEY ? " Claude conectado." : " Modo local (defina ANTHROPIC_API_KEY para o Claude)."}
        </p>
      </div>
      <Chat
        initial={(conversation?.messages ?? []).map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }))}
      />
    </div>
  );
}
