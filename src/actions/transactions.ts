"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { parseBRLToCents, parseLocalDate, toInputDate } from "@/lib/format";
import { isScheduled } from "@/lib/ledger";
import { parseReceiptDataUrl } from "@/lib/receipt";
import { newSeriesId, nextRecurrenceDate } from "@/lib/recurring";

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

async function applyBalance(
  accountId: string | null,
  type: string,
  amount: number,
  method: string,
  date: Date,
  reverse = false,
  toAccountId?: string | null,
) {
  if (method === "credit") return;
  if (isScheduled(date)) return;
  if (type === "transfer") {
    if (!accountId || !toAccountId) return;
    const delta = reverse ? amount : -amount;
    await prisma.account.update({ where: { id: accountId }, data: { balance: { increment: delta } } });
    await prisma.account.update({
      where: { id: toAccountId },
      data: { balance: { increment: reverse ? -amount : amount } },
    });
    return;
  }
  if (!accountId) return;
  const delta = type === "income" ? amount : -amount;
  await prisma.account.update({
    where: { id: accountId },
    data: { balance: { increment: reverse ? -delta : delta } },
  });
}

export async function getFormOptions() {
  const session = await requireSession();
  const [accounts, categories, cards, memberships] = await Promise.all([
    prisma.account.findMany({
      where: { userId: session.userId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.category.findMany({
      where: { userId: session.userId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, type: true },
    }),
    prisma.creditCard.findMany({
      where: { userId: session.userId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.groupMember.findMany({
      where: { userId: session.userId },
      include: { group: { include: { members: { select: { userId: true } } } } },
    }),
  ]);
  return {
    accounts,
    categories,
    cards,
    groups: memberships.map((m) => ({
      id: m.groupId,
      name: m.group.name,
      memberIds: m.group.members.map((x) => x.userId),
    })),
  };
}

export async function createTransaction(formData: FormData) {
  const session = await requireSession();
  const rawType = str(formData, "type");
  const type = rawType === "income" || rawType === "transfer" ? rawType : "expense";
  const amount = parseBRLToCents(str(formData, "amount"));
  const description = str(formData, "description");
  const date = parseLocalDate(str(formData, "date")) ?? new Date();
  const categoryId = type === "transfer" ? null : str(formData, "categoryId") || null;
  const accountId = str(formData, "accountId") || null;
  const toAccountId = type === "transfer" ? str(formData, "toAccountId") || null : null;
  const paymentMethod = type === "expense" ? str(formData, "paymentMethod") || "pix" : "pix";
  const cardId = paymentMethod === "credit" ? str(formData, "cardId") || null : null;
  const notes = str(formData, "notes") || null;
  const status = str(formData, "status") || "paid";
  const isRecurring = str(formData, "isRecurring") === "on";
  const recurrence = isRecurring ? str(formData, "recurrence") || "monthly" : null;
  const installments = Number(str(formData, "installments") || "1");

  const receipt = parseReceiptDataUrl(str(formData, "receiptUrl"));
  if (receipt.error) return { error: receipt.error };

  if (amount <= 0) return { error: "Informe um valor válido" };
  if (!description) return { error: "Informe uma descrição" };
  if (type === "transfer") {
    if (!accountId || !toAccountId) return { error: "Escolha as duas contas" };
    if (accountId === toAccountId) return { error: "Escolha contas diferentes" };
  }

  const installmentCount = paymentMethod === "credit" && installments > 1 ? installments : 1;
  const installmentAmount = Math.round(amount / installmentCount);
  let remainder = amount - installmentAmount * installmentCount;

  const seriesId = isRecurring ? newSeriesId() : null;
  const created = [];
  for (let i = 0; i < installmentCount; i += 1) {
    const extra = i === 0 ? remainder : 0;
    const txDate = new Date(date);
    txDate.setMonth(txDate.getMonth() + i);
    const tx = await prisma.transaction.create({
      data: {
        userId: session.userId,
        type,
        amount: installmentAmount + extra,
        date: txDate,
        description:
          installmentCount > 1 ? `${description} (${i + 1}/${installmentCount})` : description,
        notes,
        categoryId,
        accountId,
        toAccountId,
        paymentMethod,
        cardId,
        status: i === 0 ? status : "pending",
        isRecurring,
        recurrence,
        seriesId,
        installmentTotal: installmentCount > 1 ? installmentCount : null,
        installmentNumber: installmentCount > 1 ? i + 1 : null,
        receiptUrl: i === 0 ? receipt.url : null,
      },
    });
    created.push(tx);
    if (i === 0 && status === "paid") {
      await applyBalance(accountId, type, tx.amount, paymentMethod, txDate, false, toAccountId);
    }
  }

  if (isRecurring && created[0]) {
    const next = nextRecurrenceDate(created[0].date, recurrence);
    await prisma.transaction.create({
      data: {
        userId: session.userId,
        type,
        amount: created[0].amount,
        date: next,
        description: created[0].description,
        notes,
        categoryId,
        accountId,
        toAccountId,
        paymentMethod,
        cardId,
        status: "paid",
        isRecurring: true,
        recurrence,
        seriesId,
      },
    });
  }

  const groupId = str(formData, "groupId");
  if (groupId && type === "expense") {
    const memberIds = str(formData, "splitMembers")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
    const splitType = str(formData, "splitType") || "equal";
    await createSharedFromTransaction({
      groupId,
      transactionId: created[0].id,
      userId: session.userId,
      amount,
      date,
      description,
      memberIds,
      splitType,
      customAmounts: str(formData, "customAmounts"),
    });
  }

  revalidatePath("/dashboard");
  revalidatePath("/transacoes");
  revalidatePath("/grupos");
  return { success: true };
}

async function createSharedFromTransaction(input: {
  groupId: string;
  transactionId: string;
  userId: string;
  amount: number;
  date: Date;
  description: string;
  memberIds: string[];
  splitType: string;
  customAmounts: string;
}) {
  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: input.groupId, userId: input.userId } },
  });
  if (!membership) return;

  const members =
    input.memberIds.length > 0
      ? input.memberIds
      : (
          await prisma.groupMember.findMany({ where: { groupId: input.groupId } })
        ).map((m) => m.userId);

  const splits = buildSplits(input.amount, members, input.splitType, input.customAmounts);

  await prisma.sharedExpense.create({
    data: {
      groupId: input.groupId,
      transactionId: input.transactionId,
      description: input.description,
      amount: input.amount,
      date: input.date,
      paidById: input.userId,
      splitType: input.splitType,
      splits: { create: splits },
    },
  });
}

function buildSplits(amount: number, memberIds: string[], splitType: string, customAmounts: string) {
  if (splitType === "custom" && customAmounts) {
    const parsed = JSON.parse(customAmounts) as Record<string, number>;
    return memberIds.map((userId) => ({
      userId,
      amount: Math.round(parsed[userId] ?? 0),
    }));
  }
  if (splitType === "percent" && customAmounts) {
    const parsed = JSON.parse(customAmounts) as Record<string, number>;
    return memberIds.map((userId) => {
      const percent = parsed[userId] ?? 0;
      return { userId, amount: Math.round((amount * percent) / 100), percent };
    });
  }
  const base = Math.floor(amount / memberIds.length);
  const remainder = amount - base * memberIds.length;
  return memberIds.map((userId, index) => ({
    userId,
    amount: base + (index === 0 ? remainder : 0),
  }));
}

export async function deleteTransaction(id: string) {
  const session = await requireSession();
  const tx = await prisma.transaction.findFirst({
    where: { id, userId: session.userId },
  });
  if (!tx) return { error: "Lançamento não encontrado" };

  if (tx.status === "paid") {
    await applyBalance(tx.accountId, tx.type, tx.amount, tx.paymentMethod, tx.date, true, tx.toAccountId);
  }
  await prisma.transaction.delete({ where: { id } });
  revalidatePath("/dashboard");
  revalidatePath("/transacoes");
  return { success: true };
}

export async function updateTransaction(formData: FormData) {
  const session = await requireSession();
  const id = str(formData, "id");
  const existing = await prisma.transaction.findFirst({
    where: { id, userId: session.userId },
  });
  if (!existing) return { error: "Lançamento não encontrado" };

  const rawType = str(formData, "type");
  const type =
    rawType === "income" || rawType === "transfer" || rawType === "expense" ? rawType : existing.type;
  const amount = parseBRLToCents(str(formData, "amount"));
  const description = str(formData, "description");
  const date = parseLocalDate(str(formData, "date")) ?? existing.date;
  const categoryId = type === "transfer" ? null : str(formData, "categoryId") || null;
  const accountId = str(formData, "accountId") || null;
  const toAccountId = type === "transfer" ? str(formData, "toAccountId") || existing.toAccountId : null;
  const paymentMethod =
    type === "expense" ? str(formData, "paymentMethod") || existing.paymentMethod || "pix" : "pix";
  const cardId = paymentMethod === "credit" ? str(formData, "cardId") || existing.cardId || null : null;
  const notes = str(formData, "notes") || null;

  const receipt = parseReceiptDataUrl(str(formData, "receiptUrl"));
  if (receipt.error) return { error: receipt.error };
  const receiptUrl =
    receipt.url ?? (str(formData, "removeReceipt") === "on" ? null : existing.receiptUrl);

  if (amount <= 0) return { error: "Informe um valor válido" };
  if (!description) return { error: "Informe uma descrição" };

  if (existing.status === "paid") {
    await applyBalance(
      existing.accountId,
      existing.type,
      existing.amount,
      existing.paymentMethod,
      existing.date,
      true,
      existing.toAccountId,
    );
  }

  const updated = await prisma.transaction.update({
    where: { id },
    data: {
      type,
      amount,
      date,
      description,
      notes,
      categoryId,
      accountId,
      toAccountId,
      paymentMethod,
      cardId,
      receiptUrl,
    },
  });

  if (updated.status === "paid") {
    await applyBalance(
      updated.accountId,
      updated.type,
      updated.amount,
      updated.paymentMethod,
      updated.date,
      false,
      updated.toAccountId,
    );
  }

  revalidatePath("/dashboard");
  revalidatePath("/transacoes");
  revalidatePath("/cartoes");
  return { success: true };
}

export async function createCategory(formData: FormData) {
  const session = await requireSession();
  const name = str(formData, "name");
  const type = str(formData, "type") === "income" ? "income" : "expense";
  if (!name) return { error: "Informe o nome da categoria" };
  await prisma.category.create({
    data: {
      userId: session.userId,
      name,
      type,
      color: str(formData, "color") || "#64748b",
    },
  });
  revalidatePath("/transacoes");
  revalidatePath("/configuracoes");
  return { success: true };
}

export async function createAccount(formData: FormData) {
  const session = await requireSession();
  const name = str(formData, "name");
  if (!name) return { error: "Informe o nome da conta" };
  const type = str(formData, "type") || "checking";
  const balance = parseBRLToCents(str(formData, "balance"));
  await prisma.account.create({
    data: {
      userId: session.userId,
      name,
      type,
      balance,
      markedValue: type === "investment" ? balance : null,
      color: str(formData, "color") || "#10b981",
    },
  });
  revalidatePath("/dashboard");
  revalidatePath("/configuracoes");
  revalidatePath("/investimentos");
  return { success: true };
}

export async function updateAccount(formData: FormData) {
  const session = await requireSession();
  const id = str(formData, "id");
  const name = str(formData, "name");
  if (!id || !name) return { error: "Informe o nome da conta" };
  await prisma.account.updateMany({
    where: { id, userId: session.userId },
    data: { name, type: str(formData, "type") || "checking" },
  });
  revalidatePath("/configuracoes");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateCategory(formData: FormData) {
  const session = await requireSession();
  const id = str(formData, "id");
  const name = str(formData, "name");
  if (!id || !name) return { error: "Informe o nome da categoria" };
  await prisma.category.updateMany({
    where: { id, userId: session.userId },
    data: { name },
  });
  revalidatePath("/configuracoes");
  revalidatePath("/transacoes");
  return { success: true };
}

export async function duplicateTransaction(id: string) {
  const session = await requireSession();
  const tx = await prisma.transaction.findFirst({ where: { id, userId: session.userId } });
  if (!tx) return { error: "Lançamento não encontrado" };

  const date = parseLocalDate(toInputDate(new Date())) ?? new Date();
  const copy = await prisma.transaction.create({
    data: {
      userId: session.userId,
      type: tx.type,
      amount: tx.amount,
      date,
      description: tx.description,
      notes: tx.notes,
      categoryId: tx.categoryId,
      accountId: tx.accountId,
      toAccountId: tx.toAccountId,
      paymentMethod: tx.paymentMethod,
      cardId: tx.cardId,
      status: "paid",
      isRecurring: false,
    },
  });
  await applyBalance(copy.accountId, copy.type, copy.amount, copy.paymentMethod, copy.date, false, copy.toAccountId);
  revalidatePath("/dashboard");
  revalidatePath("/transacoes");
  return { success: true };
}

export async function upsertBudget(formData: FormData) {
  const session = await requireSession();
  const categoryId = str(formData, "categoryId");
  const amount = parseBRLToCents(str(formData, "amount"));
  if (!categoryId) return { error: "Escolha uma categoria" };
  if (amount <= 0) {
    await prisma.budget.deleteMany({ where: { userId: session.userId, categoryId } });
    revalidatePath("/dashboard");
    revalidatePath("/configuracoes");
    return { success: true };
  }
  await prisma.budget.upsert({
    where: { userId_categoryId: { userId: session.userId, categoryId } },
    update: { amount },
    create: { userId: session.userId, categoryId, amount },
  });
  revalidatePath("/dashboard");
  revalidatePath("/configuracoes");
  return { success: true };
}
