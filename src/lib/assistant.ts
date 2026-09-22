import { prisma } from "@/lib/db";

export const ASSISTANT_MESSAGE_TTL_MS = 24 * 60 * 60 * 1000;

export function assistantMessageCutoff() {
  return new Date(Date.now() - ASSISTANT_MESSAGE_TTL_MS);
}

export async function pruneAssistantMessages(userId: string) {
  const conversation = await prisma.conversation.findFirst({
    where: { userId },
    select: { id: true },
  });
  if (!conversation) return;
  await prisma.message.deleteMany({
    where: { conversationId: conversation.id, createdAt: { lt: assistantMessageCutoff() } },
  });
}
