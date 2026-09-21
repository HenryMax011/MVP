"use server";

import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { parseBRLToCents } from "@/lib/format";

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function createGroup(formData: FormData) {
  const session = await requireSession();
  const name = str(formData, "name");
  if (!name) return { error: "Informe o nome do grupo" };

  const group = await prisma.group.create({
    data: {
      name,
      description: str(formData, "description") || null,
      inviteCode: nanoid(8).toUpperCase(),
      ownerId: session.userId,
      members: {
        create: { userId: session.userId, role: "admin" },
      },
    },
  });
  revalidatePath("/grupos");
  return { success: true, id: group.id };
}

export async function joinGroup(formData: FormData) {
  const session = await requireSession();
  const code = str(formData, "inviteCode").toUpperCase();
  const group = await prisma.group.findUnique({ where: { inviteCode: code } });
  if (!group) return { error: "Código de convite inválido" };

  await prisma.groupMember.upsert({
    where: { groupId_userId: { groupId: group.id, userId: session.userId } },
    update: {},
    create: { groupId: group.id, userId: session.userId, role: "member" },
  });
  revalidatePath("/grupos");
  revalidatePath(`/grupos/${group.id}`);
  return { success: true, id: group.id };
}

export async function joinGroupByCode(code: string) {
  const session = await requireSession();
  const inviteCode = code.trim().toUpperCase();
  const group = await prisma.group.findUnique({ where: { inviteCode } });
  if (!group) return { error: "Convite inválido ou expirado" };

  await prisma.groupMember.upsert({
    where: { groupId_userId: { groupId: group.id, userId: session.userId } },
    update: {},
    create: { groupId: group.id, userId: session.userId, role: "member" },
  });
  revalidatePath("/grupos");
  revalidatePath(`/grupos/${group.id}`);
  return { success: true, id: group.id };
}

export async function addSharedExpense(groupId: string, formData: FormData) {
  const session = await requireSession();
  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: session.userId } },
  });
  if (!membership) return { error: "Você não faz parte deste grupo" };

  const description = str(formData, "description");
  const amount = parseBRLToCents(str(formData, "amount"));
  const paidById = str(formData, "paidById") || session.userId;
  const splitType = str(formData, "splitType") || "equal";
  if (!description || amount <= 0) return { error: "Informe descrição e valor" };

  const members = await prisma.groupMember.findMany({ where: { groupId } });
  const selected = str(formData, "splitMembers")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  const memberIds = selected.length > 0 ? selected : members.map((m) => m.userId);
  const base = Math.floor(amount / memberIds.length);
  const remainder = amount - base * memberIds.length;

  const expense = await prisma.sharedExpense.create({
    data: {
      groupId,
      description,
      amount,
      date: new Date(str(formData, "date") || new Date().toISOString()),
      paidById,
      splitType,
      splits: {
        create: memberIds.map((userId, index) => ({
          userId,
          amount: base + (index === 0 ? remainder : 0),
        })),
      },
    },
  });

  if (paidById === session.userId) {
    const tx = await prisma.transaction.create({
      data: {
        userId: session.userId,
        type: "expense",
        amount,
        date: expense.date,
        description,
        paymentMethod: str(formData, "paymentMethod") || "pix",
        status: "paid",
      },
    });
    await prisma.sharedExpense.update({
      where: { id: expense.id },
      data: { transactionId: tx.id },
    });
  }

  revalidatePath(`/grupos/${groupId}`);
  revalidatePath("/dashboard");
  revalidatePath("/transacoes");
  return { success: true };
}

export async function deleteSharedExpense(groupId: string, expenseId: string) {
  const session = await requireSession();
  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: session.userId } },
  });
  const expense = await prisma.sharedExpense.findFirst({ where: { id: expenseId, groupId } });
  if (!membership || !expense) return { error: "Despesa não encontrada" };
  if (membership.role !== "admin" && expense.paidById !== session.userId) {
    return { error: "Você só pode excluir os seus lançamentos" };
  }
  await prisma.sharedExpense.delete({ where: { id: expenseId } });
  revalidatePath(`/grupos/${groupId}`);
  return { success: true };
}

export async function settleUp(groupId: string, formData: FormData) {
  const session = await requireSession();
  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: session.userId } },
  });
  if (!membership) return { error: "Você não faz parte deste grupo" };

  const toId = str(formData, "toId");
  const amount = parseBRLToCents(str(formData, "amount"));
  if (!toId || amount <= 0) return { error: "Informe destinatário e valor" };

  await prisma.settlement.create({
    data: {
      groupId,
      fromId: session.userId,
      toId,
      amount,
      notes: str(formData, "notes") || null,
    },
  });
  revalidatePath(`/grupos/${groupId}`);
  revalidatePath("/dashboard");
  return { success: true };
}
