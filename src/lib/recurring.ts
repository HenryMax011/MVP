import { nanoid } from "nanoid";
import { prisma } from "@/lib/db";
import { civilDateAsLocalNoon, civilDateKey } from "@/lib/format";
import { isScheduled } from "@/lib/ledger";

export function nextRecurrenceDate(date: Date, recurrence: string | null) {
  const next = civilDateAsLocalNoon(date);
  if (recurrence === "weekly") next.setDate(next.getDate() + 7);
  else if (recurrence === "yearly") next.setFullYear(next.getFullYear() + 1);
  else next.setMonth(next.getMonth() + 1);
  return next;
}

export function newSeriesId() {
  return nanoid(12);
}

export async function ensureRecurring(userId: string) {
  const txs = await prisma.transaction.findMany({
    where: { userId, isRecurring: true },
    orderBy: { date: "asc" },
  });
  if (txs.length === 0) return 0;

  const groups = new Map<string, typeof txs>();
  for (const tx of txs) {
    const key = tx.seriesId ?? tx.id;
    const list = groups.get(key) ?? [];
    list.push(tx);
    groups.set(key, list);
  }

  let created = 0;
  for (const [, list] of groups) {
    const latest = list[list.length - 1];
    const seriesId = latest.seriesId ?? latest.id;
    if (!latest.seriesId) {
      await prisma.transaction.update({ where: { id: latest.id }, data: { seriesId } });
    }

    let cursor = latest;
    for (let i = 0; i < 12; i += 1) {
      const next = nextRecurrenceDate(cursor.date, cursor.recurrence);
      const exists = list.some((t) => civilDateKey(t.date) === civilDateKey(next));
      if (exists) {
        cursor = list.find((t) => civilDateKey(t.date) === civilDateKey(next)) ?? cursor;
        continue;
      }
      const hasFuture = list.some((t) => isScheduled(t.date));
      if (hasFuture && isScheduled(next)) break;

      const clone = await prisma.transaction.create({
        data: {
          userId,
          type: latest.type,
          amount: latest.amount,
          date: next,
          description: latest.description,
          notes: latest.notes,
          categoryId: latest.categoryId,
          accountId: latest.accountId,
          toAccountId: latest.toAccountId,
          paymentMethod: latest.paymentMethod,
          cardId: latest.cardId,
          status: "paid",
          isRecurring: true,
          recurrence: latest.recurrence,
          seriesId,
        },
      });
      list.push(clone);
      created += 1;
      if (isScheduled(next)) break;
      cursor = clone;
    }
  }

  return created;
}
