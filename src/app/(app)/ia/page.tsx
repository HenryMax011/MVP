import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Chat } from "@/components/chat";
import { pruneAssistantMessages } from "@/lib/assistant";

export default async function IaPage() {
  const session = await requireSession();
  await pruneAssistantMessages(session.userId);
  const conversation = await prisma.conversation.findFirst({
    where: { userId: session.userId },
    include: { messages: { orderBy: { createdAt: "asc" }, take: 40 } },
  });

  return (
    <div className="grid gap-3">
      <div>
        <h1 className="text-2xl font-semibold">Assistente</h1>
        <p className="max-w-xl text-sm leading-relaxed text-muted">
          Pergunte sobre seus gastos e o que ainda sobra no mês. As respostas são só suas.
        </p>
      </div>
      <Chat
        initial={(conversation?.messages ?? []).map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
          createdAt: m.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
