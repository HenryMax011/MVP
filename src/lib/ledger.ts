import { civilDateKey } from "@/lib/format";
import { prisma } from "@/lib/db";

type LedgerTx = {
  accountId: string | null;
  toAccountId?: string | null;
  type: string;
  amount: number;
  date: Date;
  status: string;
  paymentMethod: string;
};

export function isScheduled(date: Date, now = new Date()) {
  return civilDateKey(date) > civilDateKey(now);
}

export function hitsWallet(tx: LedgerTx, now = new Date()) {
  if (tx.status !== "paid") return false;
  if (tx.paymentMethod === "credit") return false;
  return !isScheduled(tx.date, now);
}

export function signedAmount(type: string, amount: number) {
  if (type === "transfer") return -amount;
  return type === "income" ? amount : -amount;
}

export async function syncAccountBalances(userId: string, now = new Date()) {
  const accounts = await prisma.account.findMany({
    where: { userId },
    orderBy: { name: "asc" },
  });
  const txs = await prisma.transaction.findMany({
    where: { userId, status: "paid", paymentMethod: { not: "credit" } },
  });

  for (const account of accounts) {
    const realized = txs.reduce((acc, t) => {
      if (!hitsWallet(t, now)) return acc;
      if (t.accountId === account.id) return acc + signedAmount(t.type, t.amount);
      if (t.type === "transfer" && t.toAccountId === account.id) return acc + t.amount;
      return acc;
    }, 0);
    if (realized !== account.balance) {
      await prisma.account.update({
        where: { id: account.id },
        data: { balance: realized },
      });
      account.balance = realized;
    }
  }

  return accounts;
}
