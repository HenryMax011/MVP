"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { addDays, addMonths, format, isSameDay, isSameMonth, startOfMonth, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { parseLocalDate, toInputDate } from "@/lib/format";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;
const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
] as const;

function toDate(value?: string) {
  return parseLocalDate(value ?? "") ?? null;
}

export function DatePicker({
  name,
  defaultValue = "",
  value,
  onChange,
  required,
  allowClear = true,
  className,
}: {
  name?: string;
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  required?: boolean;
  allowClear?: boolean;
  className?: string;
}) {
  const dialogId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [uncontrolled, setUncontrolled] = useState(defaultValue);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 296 });
  const selected = value ?? uncontrolled;
  const selectedDate = toDate(selected);
  const [view, setView] = useState(() => selectedDate ?? new Date());

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (selectedDate) setView(selectedDate);
  }, [selected]);

  useEffect(() => {
    const form = rootRef.current?.closest("form");
    if (!form) return;
    const onReset = () => {
      setUncontrolled(defaultValue);
      onChange?.(defaultValue);
    };
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, [defaultValue, onChange]);

  useEffect(() => {
    if (!open) return;

    function place() {
      const button = buttonRef.current;
      if (!button) return;
      const rect = button.getBoundingClientRect();
      const width = 296;
      const height = 360;
      const left = Math.min(Math.max(8, rect.left), window.innerWidth - width - 8);
      const below = rect.bottom + 8;
      const above = rect.top - height - 8;
      const top = below + height <= window.innerHeight - 8 ? below : Math.max(8, above);
      setPos({ top, left, width });
    }

    place();
    function onPointer(event: MouseEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      const dialog = document.getElementById(dialogId);
      if (dialog?.contains(target)) return;
      setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, dialogId]);

  const weeks = useMemo(() => {
    const start = startOfWeek(startOfMonth(view), { weekStartsOn: 0 });
    return Array.from({ length: 42 }, (_, index) => addDays(start, index));
  }, [view]);

  const years = useMemo(() => {
    const current = new Date().getFullYear();
    const start = Math.min(current - 8, view.getFullYear());
    const end = Math.max(current + 7, view.getFullYear());
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }, [view]);

  function commit(next: string) {
    if (value === undefined) setUncontrolled(next);
    onChange?.(next);
  }

  function pick(date: Date) {
    commit(toInputDate(date));
    setOpen(false);
  }

  const canClear = allowClear && !required;

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      {name ? <input type="hidden" name={name} value={selected} /> : null}
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={dialogId}
        onClick={() => setOpen((current) => !current)}
        className="flex h-11 w-full min-w-[11.5rem] items-center gap-2 rounded-xl border border-line bg-card px-3 text-left text-sm outline-none transition hover:border-primary/60 focus:border-primary focus:ring-2 focus:ring-primary/20"
      >
        <Calendar className="h-4 w-4 shrink-0 text-muted" />
        <span className={cn("tabular", selectedDate ? "text-foreground" : "text-muted")}>
          {selectedDate ? format(selectedDate, "dd/MM/yyyy") : "dd/mm/aaaa"}
        </span>
      </button>
      {mounted &&
        open &&
        createPortal(
          <div
            id={dialogId}
            role="dialog"
            aria-label="Escolher data"
            className="fixed z-[80] rounded-2xl border border-line bg-card p-3 shadow-2xl"
            style={{ top: pos.top, left: pos.left, width: pos.width }}
          >
            <div className="mb-3 flex items-center gap-2">
              <button
                type="button"
                className="rounded-lg p-1.5 text-muted hover:bg-foreground/5 hover:text-foreground"
                aria-label="Mês anterior"
                onClick={() => setView((current) => addMonths(current, -1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="grid flex-1 grid-cols-[1fr_auto] gap-1">
                <select
                  aria-label="Mês"
                  className="h-9 rounded-lg border border-line bg-background px-2 text-sm"
                  value={view.getMonth()}
                  onChange={(event) => {
                    const month = Number(event.target.value);
                    setView(new Date(view.getFullYear(), month, 1, 12));
                  }}
                >
                  {MONTHS.map((month, index) => (
                    <option key={month} value={index}>
                      {month}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Ano"
                  className="h-9 rounded-lg border border-line bg-background px-2 text-sm"
                  value={view.getFullYear()}
                  onChange={(event) => {
                    const year = Number(event.target.value);
                    setView(new Date(year, view.getMonth(), 1, 12));
                  }}
                >
                  {years.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                className="rounded-lg p-1.5 text-muted hover:bg-foreground/5 hover:text-foreground"
                aria-label="Próximo mês"
                onClick={() => setView((current) => addMonths(current, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-muted">
              {WEEKDAYS.map((day) => (
                <span key={day} className="py-1">
                  {day}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {weeks.map((day) => {
                const inMonth = isSameMonth(day, view);
                const selectedDay = selectedDate ? isSameDay(day, selectedDate) : false;
                const today = isSameDay(day, new Date());
                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => pick(day)}
                    className={cn(
                      "h-9 rounded-lg text-sm tabular transition",
                      inMonth ? "text-foreground" : "text-muted/45",
                      selectedDay
                        ? "bg-primary font-semibold text-primary-fg"
                        : today
                          ? "ring-1 ring-primary/50 hover:bg-primary/10"
                          : "hover:bg-foreground/5",
                    )}
                  >
                    {format(day, "d", { locale: ptBR })}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-3">
              {canClear ? (
                <button
                  type="button"
                  className="rounded-lg px-2 py-1 text-xs font-medium text-muted hover:text-foreground"
                  onClick={() => {
                    commit("");
                    setOpen(false);
                  }}
                >
                  Limpar
                </button>
              ) : (
                <span />
              )}
              <button
                type="button"
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-fg"
                onClick={() => pick(new Date())}
              >
                Hoje
              </button>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
