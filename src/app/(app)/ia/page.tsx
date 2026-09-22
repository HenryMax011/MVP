import { requireSession } from "@/lib/auth";
import { Chat } from "@/components/chat";
import { clearAssistantMessages } from "@/lib/assistant";

export default async function IaPage() {
  const session = await requireSession();
  await clearAssistantMessages(session.userId);

  return (
    <div className="grid gap-3">
      <div>
        <h1 className="text-2xl font-semibold">Assistente</h1>
        <p className="max-w-xl text-sm leading-relaxed text-muted">
          Pergunte sobre seus gastos e o que ainda sobra no mês. As respostas são só suas.
        </p>
      </div>
      <Chat />
    </div>
  );
}
