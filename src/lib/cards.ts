import { inCivilRange } from "@/lib/format";

export function getCardCycle(closingDay: number, ref = new Date()) {
  const year = ref.getFullYear();
  const month = ref.getMonth();
  const day = ref.getDate();

  const cycleEnd =
    day > closingDay
      ? new Date(year, month + 1, closingDay, 23, 59, 59, 999)
      : new Date(year, month, closingDay, 23, 59, 59, 999);

  const cycleStart = new Date(
    cycleEnd.getFullYear(),
    cycleEnd.getMonth() - 1,
    closingDay + 1,
    0,
    0,
    0,
    0,
  );

  return { cycleStart, cycleEnd };
}

export function dueDateForCycle(cycleEnd: Date, dueDay: number) {
  const due = new Date(cycleEnd.getFullYear(), cycleEnd.getMonth(), dueDay, 12);
  if (due <= cycleEnd) {
    due.setMonth(due.getMonth() + 1);
  }
  return due;
}

export function inRange(date: Date, start: Date, end: Date) {
  return inCivilRange(date, start, end);
}

export function signedCardAmount(paymentMethod: string, amount: number) {
  return paymentMethod === "invoice" ? -amount : amount;
}
