import { format, isThisMonth, isToday, startOfWeek, endOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";

export function formatBRL(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

export function formatBRLInput(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",");
}

export function formatBRLSigned(cents: number) {
  const sign = cents > 0 ? "+" : cents < 0 ? "−" : "";
  return `${sign}${formatBRL(Math.abs(cents))}`;
}

export function parseBRLToCents(value: string): number {
  const cleaned = value.replace(/\s/g, "").replace(/R\$/g, "").trim();
  if (!cleaned) return 0;
  const normalized = cleaned.includes(",")
    ? cleaned.replace(/\./g, "").replace(",", ".")
    : cleaned;
  const n = Number(normalized);
  if (Number.isNaN(n)) return 0;
  return Math.round(n * 100);
}

export function formatPercent(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

export function parseLocalDate(value: string | undefined | null) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value ?? "").trim());
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0, 0);
}

/** Date-only values stored as UTC midnight must keep that calendar day in Brazil (UTC-3). */
export function civilDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  const utcMidnight =
    date.getUTCHours() === 0 &&
    date.getUTCMinutes() === 0 &&
    date.getUTCSeconds() === 0 &&
    date.getUTCMilliseconds() === 0;
  if (utcMidnight) {
    return {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth(),
      day: date.getUTCDate(),
    };
  }
  return {
    year: date.getFullYear(),
    month: date.getMonth(),
    day: date.getDate(),
  };
}

export function civilDateKey(value: Date | string) {
  const { year, month, day } = civilDate(value);
  return year * 10000 + (month + 1) * 100 + day;
}

export function civilDateAsLocalNoon(value: Date | string) {
  const { year, month, day } = civilDate(value);
  return new Date(year, month, day, 12, 0, 0, 0);
}

export function inCivilRange(date: Date | string, start: Date | string, end: Date | string) {
  const key = civilDateKey(date);
  return key >= civilDateKey(start) && key <= civilDateKey(end);
}

export function toInputDate(date: Date) {
  const { year, month, day } = civilDate(date);
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function startOfLocalDay(date: Date) {
  const { year, month, day } = civilDate(date);
  return new Date(year, month, day, 0, 0, 0, 0);
}

export function endOfLocalDay(date: Date) {
  const { year, month, day } = civilDate(date);
  return new Date(year, month, day, 23, 59, 59, 999);
}

export function formatDate(date: Date | string) {
  return format(civilDateAsLocalNoon(date), "dd/MM/yyyy", { locale: ptBR });
}

export function formatDateShort(date: Date | string) {
  return format(civilDateAsLocalNoon(date), "dd MMM", { locale: ptBR });
}

export function formatPeriodLabel(from: Date, to: Date) {
  const sameYear = from.getFullYear() === to.getFullYear();
  const sameMonth = sameYear && from.getMonth() === to.getMonth();
  const sameDay = sameMonth && from.getDate() === to.getDate();
  if (sameDay) {
    return format(from, "d 'de' MMMM 'de' yyyy", { locale: ptBR });
  }
  if (sameMonth) {
    return `${format(from, "d", { locale: ptBR })} a ${format(to, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}`;
  }
  if (sameYear) {
    return `${format(from, "d 'de' MMM", { locale: ptBR })} a ${format(to, "d 'de' MMM 'de' yyyy", { locale: ptBR })}`;
  }
  return `${format(from, "dd/MM/yyyy", { locale: ptBR })} a ${format(to, "dd/MM/yyyy", { locale: ptBR })}`;
}

export function monthLabel(date: Date) {
  return format(date, "MMMM yyyy", { locale: ptBR });
}

export function monthKey(date: Date) {
  return format(date, "yyyy-MM");
}

export function percentChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export { isThisMonth, isToday, startOfWeek, endOfWeek };
