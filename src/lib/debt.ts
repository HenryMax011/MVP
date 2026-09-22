import { addMonths } from "date-fns";

export function projectPayoff({
  remaining,
  monthly,
  interestRate,
  from,
}: {
  remaining: number;
  monthly: number;
  interestRate?: number | null;
  from?: Date | null;
}) {
  if (remaining <= 0) {
    return { months: 0, date: from ?? new Date(), done: true as const };
  }
  if (monthly <= 0) {
    return { months: null, date: null, done: false as const, stuck: false as const };
  }

  const start = from ?? new Date();
  const rate = (interestRate ?? 0) / 100;
  let balance = remaining;
  let months = 0;

  while (balance > 0 && months < 600) {
    months += 1;
    if (rate > 0) {
      balance = Math.round(balance * (1 + rate));
      if (monthly <= Math.round(balance * rate) && months > 1) {
        return { months: null, date: null, done: false as const, stuck: true as const };
      }
    }
    balance -= monthly;
  }

  if (balance > 0) {
    return { months: null, date: null, done: false as const, stuck: true as const };
  }

  return {
    months,
    date: addMonths(start, Math.max(months - 1, 0)),
    done: false as const,
    stuck: false as const,
  };
}

export function formatPayoffMonth(date: Date) {
  const label = date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}
