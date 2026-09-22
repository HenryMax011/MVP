import { prisma } from "@/lib/db";

export async function clearAssistantMessages(userId: string) {
  const conversation = await prisma.conversation.findFirst({
    where: { userId },
    select: { id: true },
  });
  if (!conversation) return;
  await prisma.message.deleteMany({
    where: { conversationId: conversation.id },
  });
}
