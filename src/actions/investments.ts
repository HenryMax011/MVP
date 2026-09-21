"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { parseBRLToCents, parseLocalDate } from "@/lib/format";
import { isScheduled } from "@/lib/ledger";

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function createInvestmentAccount(formData: FormData) {
  const session = await requireSession();
  const name = str(formData, "name");
  if (!name) return { error: "Informe o nome do investimento" };
  const opening = parseBRLToCents(str(formData, "balance"));
  await prisma.account.create({
    data: {
      userId: session.userId,
      name,
      type: "investment",
      balance: opening,
      markedValue: opening || null,
      color: str(formData, "color") || "#0d9488",
    },
  });
  revalidatePath("/investimentos");
  revalidatePath("/dashboard");
  revalidatePath("/configuracoes");
  return { success: true };
}

export async function updateInvestmentPosition(formData: FormData) {
  const session = await requireSession();
  const id = str(formData, "id");
  const markedValue = parseBRLToCents(str(formData, "markedValue"));
  if (!id) return { error: "Conta inválida" };
  await prisma.account.updateMany({
    where: { id, userId: session.userId, type: "investment" },
    data: { markedValue },
  });
  revalidatePath("/investimentos");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function moveInvestment(formData: FormData) {
  const session = await requireSession();
  const investmentId = str(formData, "investmentId");
  const otherId = str(formData, "otherId");
  const amount = parseBRLToCents(str(formData, "amount"));
  const kind = str(formData, "kind") === "withdraw" ? "withdraw" : "deposit";
  const date = parseLocalDate(str(formData, "date")) ?? new Date();
  const investment = await prisma.account.findFirst({
    where: { id: investmentId, userId: session.userId, type: "investment" },
  });
  const other = await prisma.account.findFirst({
    where: { id: otherId, userId: session.userId },
  });
  if (!investment || !other || amount <= 0) return { error: "Informe conta, investimento e valor" };
  if (investmentId === otherId) return { error: "Escolha contas diferentes" };

  const fromId = kind === "deposit" ? otherId : investmentId;
  const toId = kind === "deposit" ? investmentId : otherId;
  await prisma.transaction.create({
    data: {
      userId: session.userId,
      type: "transfer",
      amount,
      date,
      description: kind === "deposit" ? `Aporte ${investment.name}` : `Resgate ${investment.name}`,
      accountId: fromId,
      toAccountId: toId,
      paymentMethod: "pix",
      status: "paid",
    },
  });
  if (!isScheduled(date)) {
    await prisma.account.update({ where: { id: fromId }, data: { balance: { decrement: amount } } });
    await prisma.account.update({ where: { id: toId }, data: { balance: { increment: amount } } });
    if (kind === "deposit") {
      await prisma.account.update({
        where: { id: investmentId },
        data: { markedValue: (investment.markedValue ?? investment.balance) + amount },
      });
    } else {
      const current = investment.markedValue ?? investment.balance;
      await prisma.account.update({
        where: { id: investmentId },
        data: { markedValue: Math.max(0, current - amount) },
      });
    }
  }
  revalidatePath("/investimentos");
  revalidatePath("/dashboard");
  revalidatePath("/transacoes");
  return { success: true };
}
