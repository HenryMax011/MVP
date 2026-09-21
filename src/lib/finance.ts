import { differenceInCalendarDays, endOfMonth, endOfWeek, startOfMonth, startOfWeek, subDays, subMonths } from "date-fns";
import { prisma } from "@/lib/db";
import { dueDateForCycle, getCardCycle, inRange, signedCardAmount } from "@/lib/cards";
import { civilDateKey, endOfLocalDay, inCivilRange, percentChange, startOfLocalDay } from "@/lib/format";
import { simplifyDebts } from "@/lib/splits";
import { isScheduled } from "@/lib/ledger";

function monthRange(date: Date) {
  return { start: startOfMonth(date), end: endOfMonth(date) };
}

export function defaultDashboardRange(now = new Date()) {
  return { from: startOfMonth(now), to: endOfLocalDay(now) };
}

export async function getDashboardData(
  userId: string,
  range?: { from: Date; to: Date },
) {
  const now = new Date();
  const from = startOfLocalDay(range?.from ?? startOfMonth(now));
  const to = endOfLocalDay(range?.to ?? now);
  const spanDays = Math.max(1, differenceInCalendarDays(to, from) + 1);
  const prevTo = endOfLocalDay(subDays(from, 1));
  const prevFrom = startOfLocalDay(subDays(from, spanDays));
  const thisMonth = monthRange(now);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const todayStart = startOfLocalDay(now);
  const historyStart = startOfMonth(subMonths(from, 5));
  const fetchStart = subDays(historyStart, 2);

  const [accounts, bills, debts, txs, memberships, cards, budgets, goals] = await Promise.all([
    prisma.account.findMany({ where: { userId }, orderBy: { name: "asc" } }),
    prisma.bill.findMany({
      where: { userId },
      select: { id: true, name: true, amount: true, dueDate: true, status: true },
    }),
    prisma.debt.findMany({ where: { userId } }),
    prisma.transaction.findMany({
      where: { userId, date: { gte: fetchStart } },
      include: { category: { select: { name: true, color: true } } },
      orderBy: { date: "desc" },
    }),
    prisma.groupMember.findMany({
      where: { userId },
      include: { group: { select: { id: true, name: true } } },
    }),
    prisma.creditCard.findMany({ where: { userId } }),
    prisma.budget.findMany({
      where: { userId },
      include: { category: { select: { id: true, name: true, color: true } } },
    }),
    prisma.goal.findMany({
      where: { userId },
      include: { account: { select: { id: true, name: true, balance: true, markedValue: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const paid = txs.filter((t) => t.status === "paid");
  const happened = paid.filter((t) => !isScheduled(t.date, now));
  const scheduled = txs.filter((t) => isScheduled(t.date, now));
  const periodTx = paid.filter((t) => t.type !== "transfer" && inCivilRange(t.date, from, to));
  const lastPeriodTx = paid.filter((t) => t.type !== "transfer" && inCivilRange(t.date, prevFrom, prevTo));
  const monthTx = happened.filter((t) => t.type !== "transfer" && inCivilRange(t.date, thisMonth.start, thisMonth.end));
  const periodAll = paid.filter((t) => inCivilRange(t.date, from, to));
  const weekExpenses = happened.filter((t) => t.type === "expense" && inCivilRange(t.date, weekStart, weekEnd));
  const todayExpenses = happened.filter((t) => t.type === "expense" && civilDateKey(t.date) >= civilDateKey(todayStart));
  const recentTx = periodAll;

  const sumByType = (list: { type: string; amount: number }[], type: string) =>
    list.filter((t) => t.type === type).reduce((acc, t) => acc + t.amount, 0);

  const income = sumByType(periodTx, "income");
  const expenses = sumByType(periodTx, "expense");
  const lastIncome = sumByType(lastPeriodTx, "income");
  const lastExpenses = sumByType(lastPeriodTx, "expense");
  const monthIncome = sumByType(monthTx, "income");
  const monthExpenses = sumByType(monthTx, "expense");

  const liquidAccounts = accounts.filter((a) => a.type !== "investment");
  const investmentAccounts = accounts.filter((a) => a.type === "investment");
  const available = liquidAccounts.reduce((acc, a) => acc + a.balance, 0);
  const invested = investmentAccounts.reduce((acc, a) => acc + (a.markedValue ?? a.balance), 0);
  const pendingBills = bills
    .filter((b) => b.status === "pending")
    .reduce((acc, b) => acc + b.amount, 0);

  const cardInvoices = cards.map((card) => {
    const { cycleStart, cycleEnd } = getCardCycle(card.closingDay, now);
    const cardTxs = txs.filter((t) => t.cardId === card.id);
    const current = Math.max(
      0,
      cardTxs
        .filter((t) => inRange(t.date, cycleStart, cycleEnd))
        .reduce((acc, t) => acc + signedCardAmount(t.paymentMethod, t.amount), 0),
    );
    const used = Math.max(
      0,
      cardTxs
        .filter((t) => civilDateKey(t.date) >= civilDateKey(cycleStart))
        .reduce((acc, t) => acc + signedCardAmount(t.paymentMethod, t.amount), 0),
    );
    return {
      id: card.id,
      name: card.name,
      brand: card.brand,
      color: card.color,
      limit: card.creditLimit,
      used,
      available: card.creditLimit - used,
      currentInvoice: current,
      dueDate: dueDateForCycle(cycleEnd, card.dueDay),
      closingDay: card.closingDay,
      dueDay: card.dueDay,
    };
  });

  const cardDebt = cardInvoices.reduce((acc, c) => acc + c.used, 0);
  const leftover = income - expenses;

  const byCategory = new Map<string, { name: string; color: string; amount: number }>();
  for (const tx of periodTx.filter((t) => t.type === "expense")) {
    const name = tx.category?.name ?? "Outros";
    const color = tx.category?.color ?? "#94a3b8";
    const current = byCategory.get(name) ?? { name, color, amount: 0 };
    current.amount += tx.amount;
    byCategory.set(name, current);
  }

  const byMethod = new Map<string, number>();
  for (const tx of periodTx.filter((t) => t.type === "expense")) {
    byMethod.set(tx.paymentMethod, (byMethod.get(tx.paymentMethod) ?? 0) + tx.amount);
  }

  const months: { key: string; label: string; income: number; expenses: number }[] = [];
  for (let i = 5; i >= 0; i -= 1) {
    const d = subMonths(now, i);
    const bucket = monthRange(d);
    const bucketTx = happened.filter((t) => inCivilRange(t.date, bucket.start, bucket.end));
    months.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
      income: sumByType(bucketTx, "income"),
      expenses: sumByType(bucketTx, "expense"),
    });
  }

  const groupSummaries = await Promise.all(
    memberships.map(async (m) => {
      const balances = await getGroupBalances(m.groupId);
      const mine = balances.find((b) => b.userId === userId);
      return {
        id: m.groupId,
        name: m.group.name,
        net: mine?.net ?? 0,
      };
    }),
  );

  const upcomingBills = bills
    .filter((b) => b.status === "pending")
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
    .slice(0, 5);

  return {
    from,
    to,
    available,
    invested,
    income,
    expenses,
    pendingBills,
    cardDebt,
    leftover,
    todayExpenses: todayExpenses.reduce((acc, t) => acc + t.amount, 0),
    weekExpenses: weekExpenses.reduce((acc, t) => acc + t.amount, 0),
    monthExpenses,
    monthIncome,
    incomeChange: percentChange(income, lastIncome),
    expenseChange: percentChange(expenses, lastExpenses),
    lastIncome,
    lastExpenses,
    byCategory: [...byCategory.values()].sort((a, b) => b.amount - a.amount),
    byMethod: [...byMethod.entries()].map(([method, amount]) => ({ method, amount })),
    months,
    cardInvoices,
    accounts: liquidAccounts,
    investmentAccounts,
    upcomingBills,
    recentTx,
    scheduled: scheduled.map((t) => ({
      id: t.id,
      type: t.type,
      amount: t.amount,
      date: t.date,
      description: t.description,
    })),
    debts,
    bills,
    groupSummaries,
    goals: goals.map((g) => {
      const saved = g.account ? (g.account.markedValue ?? g.account.balance) : g.savedAmount;
      return {
        id: g.id,
        name: g.name,
        targetAmount: g.targetAmount,
        saved,
        deadline: g.deadline,
        color: g.color,
        accountName: g.account?.name ?? null,
      };
    }),
    budgets: budgets.map((b) => {
      const used = monthTx
        .filter((t) => t.type === "expense" && t.categoryId === b.categoryId)
        .reduce((acc, t) => acc + t.amount, 0);
      return {
        id: b.id,
        categoryId: b.categoryId,
        name: b.category.name,
        color: b.category.color,
        amount: b.amount,
        used,
      };
    }),
  };
}

export async function getGroupBalances(groupId: string) {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      members: { include: { user: true } },
      expenses: { include: { splits: true } },
      settlements: true,
    },
  });

  if (!group) return [];

  const nets = new Map<string, { userId: string; name: string; net: number }>();
  for (const member of group.members) {
    nets.set(member.userId, {
      userId: member.userId,
      name: member.user.name,
      net: 0,
    });
  }

  for (const expense of group.expenses) {
    const payer = nets.get(expense.paidById);
    if (payer) payer.net += expense.amount;
    for (const split of expense.splits) {
      const person = nets.get(split.userId);
      if (person) person.net -= split.amount;
    }
  }

  for (const s of group.settlements) {
    const from = nets.get(s.fromId);
    const to = nets.get(s.toId);
    if (from) from.net += s.amount;
    if (to) to.net -= s.amount;
  }

  return [...nets.values()];
}

export async function getGroupTransfers(groupId: string) {
  return simplifyDebts(await getGroupBalances(groupId));
}

export async function getUserFinanceSnapshot(userId: string) {
  const data = await getDashboardData(userId);

  return {
    available: data.available,
    invested: data.invested,
    income: data.income,
    expenses: data.expenses,
    leftover: data.leftover,
    pendingBills: data.pendingBills,
    cardDebt: data.cardDebt,
    todayExpenses: data.todayExpenses,
    weekExpenses: data.weekExpenses,
    byCategory: data.byCategory,
    bills: data.bills.map((b) => ({
      name: b.name,
      amount: b.amount,
      dueDate: b.dueDate.toISOString(),
      status: b.status,
    })),
    cards: data.cardInvoices,
    debts: data.debts.map((d) => ({
      creditor: d.creditor,
      totalAmount: d.totalAmount,
      paidAmount: d.paidAmount,
      remaining: d.totalAmount - d.paidAmount,
      nextDueDate: d.nextDueDate?.toISOString() ?? null,
    })),
    groups: data.groupSummaries,
  };
}
