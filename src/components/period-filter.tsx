"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { DatePicker } from "@/components/ui/date-picker";
import { toInputDate } from "@/lib/format";

function presetHref(from: Date, to: Date) {
  return `/dashboard?de=${toInputDate(from)}&ate=${toInputDate(to)}`;
}

export function PeriodFilter({ from, to }: { from: string; to: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(today);
  const weekday = (today.getDay() + 6) % 7;
  weekStart.setDate(today.getDate() - weekday);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  function apply(href: string) {
    startTransition(() => {
      router.push(href);
    });
  }

  return (
    <div className="rounded-2xl border border-line bg-card p-4">
      <p className="mb-1 text-sm font-semibold">Escolha as datas</p>
      <p className="mb-3 text-xs text-muted">
        Ao filtrar, Entrou e Saiu passam a somar tudo nesse intervalo — inclusive o que ainda vai cair ou sair.
      </p>
      <form
        key={`${from}-${to}`}
        className="flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const de = String(data.get("de") ?? "");
          const ate = String(data.get("ate") ?? "");
          if (!de || !ate) return;
          apply(`/dashboard?de=${de}&ate=${ate}`);
        }}
      >
        <label className="grid gap-1 text-xs text-muted">
          Começa em
          <DatePicker name="de" defaultValue={from} required allowClear={false} />
        </label>
        <label className="grid gap-1 text-xs text-muted">
          Termina em
          <DatePicker name="ate" defaultValue={to} required allowClear={false} />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="h-10 rounded-xl bg-primary px-4 text-sm font-medium text-primary-fg disabled:opacity-70"
        >
          {pending ? "Filtrando…" : "Filtrar"}
        </button>
      </form>
      <div className="mt-3 flex flex-wrap gap-2">
        {[
          { href: presetHref(today, today), label: "Hoje" },
          { href: presetHref(weekStart, weekEnd), label: "Esta semana" },
          { href: presetHref(monthStart, monthEnd), label: "Este mês" },
          { href: presetHref(lastMonthStart, lastMonthEnd), label: "Mês passado" },
        ].map((p) => (
          <button
            key={p.label}
            type="button"
            disabled={pending}
            onClick={() => apply(p.href)}
            className="rounded-full border border-line px-3 py-1 text-xs font-medium text-muted hover:border-primary hover:text-primary disabled:opacity-70"
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
