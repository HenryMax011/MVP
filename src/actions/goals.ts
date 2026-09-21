"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { parseBRLToCents, parseLocalDate } from "@/lib/format";
import { isScheduled } from "@/lib/ledger";

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function createGoal(formData: FormData) {
  const session = await requireSession();
  const name = str(formData, "name");
  const targetAmount = parseBRLToCents(str(formData, "targetAmount"));
  const accountId = str(formData, "accountId") || null;
  if (!name || targetAmount <= 0) return { error: "Informe o nome e o valor da meta" };
  if (accountId) {
    const account = await prisma.account.findFirst({
      where: { id: accountId, userId: session.userId },
    });
    if (!account) return { error: "Conta inválida" };
  }

  await prisma.goal.create({
    data: {
      userId: session.userId,
      name,
      targetAmount,
      deadline: parseLocalDate(str(formData, "deadline")),
      accountId,
      color: str(formData, "color") || "#0c8a5d",
      notes: str(formData, "notes") || null,
    },
  });
  revalidatePath("/metas");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteGoal(id: string) {
  const session = await requireSession();
  await prisma.goal.deleteMany({ where: { id, userId: session.userId } });
  revalidatePath("/metas");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function contributeGoal(formData: FormData) {
  const session = await requireSession();
  const goalId = str(formData, "goalId");
  const fromAccountId = str(formData, "fromAccountId");
  const amount = parseBRLToCents(str(formData, "amount"));
  const date = parseLocalDate(str(formData, "date")) ?? new Date();
  const goal = await prisma.goal.findFirst({ where: { id: goalId, userId: session.userId } });
  if (!goal) return { error: "Meta não encontrada" };
  const from = await prisma.account.findFirst({
    where: { id: fromAccountId, userId: session.userId },
  });
  if (!from) return { error: "Escolha de onde sai o dinheiro" };
  if (amount <= 0) return { error: "Informe um valor" };
  if (goal.accountId && goal.accountId === fromAccountId) {
    return { error: "Escolha outra conta para tirar o valor" };
  }

  if (goal.accountId) {
    await prisma.transaction.create({
      data: {
        userId: session.userId,
        type: "transfer",
        amount,
        date,
        description: `Guardar: ${goal.name}`,
        accountId: fromAccountId,
        toAccountId: goal.accountId,
        paymentMethod: "pix",
        status: "paid",
        goalId: goal.id,
      },
    });
    if (!isScheduled(date)) {
      await prisma.account.update({
        where: { id: fromAccountId },
        data: { balance: { decrement: amount } },
      });
      await prisma.account.update({
        where: { id: goal.accountId },
        data: { balance: { increment: amount } },
      });
    }
  } else {
    await prisma.transaction.create({
      data: {
        userId: session.userId,
        type: "expense",
        amount,
        date,
        description: `Guardar: ${goal.name}`,
        accountId: fromAccountId,
        paymentMethod: "pix",
        status: "paid",
        goalId: goal.id,
      },
    });
    if (!isScheduled(date)) {
      await prisma.account.update({
        where: { id: fromAccountId },
        data: { balance: { decrement: amount } },
      });
    }
    await prisma.goal.update({
      where: { id: goal.id },
      data: { savedAmount: { increment: amount } },
    });
  }

  revalidatePath("/metas");
  revalidatePath("/dashboard");
  revalidatePath("/transacoes");
  return { success: true };
}
