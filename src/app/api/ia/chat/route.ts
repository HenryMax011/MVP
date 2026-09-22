import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { answerAssistant } from "@/lib/ai";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  const session = await requireSession();
  let body: { message?: string };
  try {
    body = (await req.json()) as { message?: string };
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const message = body.message?.trim();
  if (!message) {
    return NextResponse.json({ error: "Mensagem vazia" }, { status: 400 });
  }

  let conversation = await prisma.conversation.findFirst({
    where: { userId: session.userId },
    include: { messages: { orderBy: { createdAt: "asc" }, take: 20 } },
  });
  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: { userId: session.userId },
      include: { messages: true },
    });
  }

  const history = conversation.messages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  const { reply, provider } = await answerAssistant(session.userId, history, message);

  await prisma.message.createMany({
    data: [
      { conversationId: conversation.id, role: "user", content: message },
      { conversationId: conversation.id, role: "assistant", content: reply },
    ],
  });

  return NextResponse.json({ reply, provider });
}
