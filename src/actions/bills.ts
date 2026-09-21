"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { parseBRLToCents, parseLocalDate } from "@/lib/format";
import { isScheduled } from "@/lib/ledger";

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function createBill(formData: FormData) {
  const session = await requireSession();
  const name = str(formData, "name");
  const amount = parseBRLToCents(str(formData, "amount"));
  if (!name || amount <= 0) return { error: "Informe nome e valor da conta" };

  await prisma.bill.create({
    data: {
      userId: session.userId,
      name,
      amount,
      dueDate: parseLocalDate(str(formData, "dueDate")) ?? new Date(),
      categoryId: str(formData, "categoryId") || null,
      accountId: str(formData, "accountId") || null,
      recurrence: str(formData, "recurrence") || "monthly",
      status: "pending",
    },
  });
  revalidatePath("/contas");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function payBill(id: string) {
  const session = await requireSession();
  const bill = await prisma.bill.findFirst({ where: { id, userId: session.userId } });
  if (!bill) return { error: "Conta não encontrada" };
  if (bill.status === "paid") return { error: "Essa conta já foi paga" };

  const tx = await prisma.transaction.create({
    data: {
      userId: session.userId,
      type: "expense",
      amount: bill.amount,
      date: new Date(),
      description: bill.name,
      categoryId: bill.categoryId,
      accountId: bill.accountId,
      paymentMethod: "boleto",
      status: "paid",
      isRecurring: bill.recurrence !== "once",
      recurrence: bill.recurrence !== "once" ? bill.recurrence : null,
      billId: bill.id,
    },
  });

  if (bill.accountId) {
    await prisma.account.update({
      where: { id: bill.accountId },
      data: { balance: { decrement: bill.amount } },
    });
  }

  await prisma.bill.update({
    where: { id: bill.id },
    data: { status: "paid", paidAt: new Date() },
  });

  if (bill.recurrence === "monthly" || bill.recurrence === "yearly") {
    const next = new Date(bill.dueDate);
    if (bill.recurrence === "monthly") next.setMonth(next.getMonth() + 1);
    else next.setFullYear(next.getFullYear() + 1);
    await prisma.bill.create({
      data: {
        userId: bill.userId,
        name: bill.name,
        amount: bill.amount,
        dueDate: next,
        categoryId: bill.categoryId,
        accountId: bill.accountId,
        recurrence: bill.recurrence,
        status: "pending",
      },
    });
  }

  revalidatePath("/contas");
  revalidatePath("/dashboard");
  revalidatePath("/transacoes");
  return { success: true, transactionId: tx.id };
}

export async function deleteBill(id: string) {
  const session = await requireSession();
  await prisma.bill.deleteMany({ where: { id, userId: session.userId } });
  revalidatePath("/contas");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function createCard(formData: FormData) {
  const session = await requireSession();
  const name = str(formData, "name");
  const creditLimit = parseBRLToCents(str(formData, "limit"));
  if (!name || creditLimit <= 0) return { error: "Informe nome e limite do cartão" };

  await prisma.creditCard.create({
    data: {
      userId: session.userId,
      name,
      brand: str(formData, "brand") || "visa",
      creditLimit,
      closingDay: Number(str(formData, "closingDay") || "10"),
      dueDay: Number(str(formData, "dueDay") || "17"),
      color: str(formData, "color") || "#6366f1",
    },
  });
  revalidatePath("/cartoes");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateBill(formData: FormData) {
  const session = await requireSession();
  const id = str(formData, "id");
  const name = str(formData, "name");
  const amount = parseBRLToCents(str(formData, "amount"));
  if (!id || !name || amount <= 0) return { error: "Informe nome e valor" };
  await prisma.bill.updateMany({
    where: { id, userId: session.userId },
    data: {
      name,
      amount,
      dueDate: parseLocalDate(str(formData, "dueDate")) ?? new Date(),
      categoryId: str(formData, "categoryId") || null,
      accountId: str(formData, "accountId") || null,
      recurrence: str(formData, "recurrence") || "monthly",
    },
  });
  revalidatePath("/contas");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateCard(formData: FormData) {
  const session = await requireSession();
  const id = str(formData, "id");
  const name = str(formData, "name");
  const creditLimit = parseBRLToCents(str(formData, "limit"));
  if (!id || !name || creditLimit <= 0) return { error: "Informe nome e limite" };
  await prisma.creditCard.updateMany({
    where: { id, userId: session.userId },
    data: {
      name,
      brand: str(formData, "brand") || "visa",
      creditLimit,
      closingDay: Number(str(formData, "closingDay") || "10"),
      dueDay: Number(str(formData, "dueDay") || "17"),
    },
  });
  revalidatePath("/cartoes");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function payCardInvoice(formData: FormData) {
  const session = await requireSession();
  const cardId = str(formData, "cardId");
  const accountId = str(formData, "accountId");
  const amount = parseBRLToCents(str(formData, "amount"));
  const card = await prisma.creditCard.findFirst({ where: { id: cardId, userId: session.userId } });
  if (!card) return { error: "Cartão não encontrado" };
  if (!accountId) return { error: "Escolha a conta que vai pagar" };
  if (amount <= 0) return { error: "Informe um valor válido" };

  const date = parseLocalDate(str(formData, "date")) ?? new Date();
  await prisma.transaction.create({
    data: {
      userId: session.userId,
      type: "expense",
      amount,
      date,
      description: `Fatura ${card.name}`,
      accountId,
      cardId: card.id,
      paymentMethod: "invoice",
      status: "paid",
    },
  });

  if (!isScheduled(date)) {
    await prisma.account.update({
      where: { id: accountId },
      data: { balance: { decrement: amount } },
    });
  }

  revalidatePath("/cartoes");
  revalidatePath("/dashboard");
  revalidatePath("/transacoes");
  return { success: true };
}

export async function deleteCard(id: string) {
  const session = await requireSession();
  await prisma.creditCard.deleteMany({ where: { id, userId: session.userId } });
  revalidatePath("/cartoes");
  return { success: true };
}

export async function createDebt(formData: FormData) {
  const session = await requireSession();
  const creditor = str(formData, "creditor");
  const totalAmount = parseBRLToCents(str(formData, "totalAmount"));
  if (!creditor || totalAmount <= 0) return { error: "Informe credor e valor" };

  await prisma.debt.create({
    data: {
      userId: session.userId,
      creditor,
      totalAmount,
      paidAmount: parseBRLToCents(str(formData, "paidAmount")),
      interestRate: str(formData, "interestRate") ? Number(str(formData, "interestRate")) : null,
      installments: str(formData, "installments") ? Number(str(formData, "installments")) : null,
      startDate: new Date(str(formData, "startDate") || new Date().toISOString()),
      nextDueDate: str(formData, "nextDueDate") ? new Date(str(formData, "nextDueDate")) : null,
      notes: str(formData, "notes") || null,
    },
  });
  revalidatePath("/dividas");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function payDebtInstallment(id: string, amountRaw: string) {
  const session = await requireSession();
  const debt = await prisma.debt.findFirst({ where: { id, userId: session.userId } });
  if (!debt) return { error: "Dívida não encontrada" };
  const amount = parseBRLToCents(amountRaw);
  if (amount <= 0) return { error: "Informe um valor válido" };

  const paidAmount = Math.min(debt.totalAmount, debt.paidAmount + amount);
  let nextDueDate = debt.nextDueDate;
  if (nextDueDate) {
    const next = new Date(nextDueDate);
    next.setMonth(next.getMonth() + 1);
    nextDueDate = paidAmount >= debt.totalAmount ? null : next;
  }

  await prisma.debt.update({
    where: { id },
    data: { paidAmount, nextDueDate },
  });
  revalidatePath("/dividas");
  return { success: true };
}

export async function deleteDebt(id: string) {
  const session = await requireSession();
  await prisma.debt.deleteMany({ where: { id, userId: session.userId } });
  revalidatePath("/dividas");
  return { success: true };
}
