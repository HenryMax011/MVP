import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { TransactionForm, type FormOptions } from "@/components/transaction-form";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/card";
import { Money } from "@/components/money";
import { deleteTransaction, duplicateTransaction } from "@/actions/transactions";
import { ConfirmButton } from "@/components/confirm-button";
import { EditTransactionButton } from "@/components/edit-transaction-button";
import { ReceiptThumb } from "@/components/receipt-thumb";
import { DatePicker } from "@/components/ui/date-picker";
import { PAYMENT_METHODS } from "@/lib/constants";
import {
  civilDateKey,
  endOfLocalDay,
  formatDate,
  parseLocalDate,
  startOfLocalDay,
  toInputDate,
} from "@/lib/format";

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function extractHref(params: { q?: string; tipo?: string; de?: string; ate?: string }) {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.tipo) search.set("tipo", params.tipo);
  if (params.de) search.set("de", params.de);
  if (params.ate) search.set("ate", params.ate);
  const query = search.toString();
  return query ? `/transacoes?${query}` : "/transacoes";
}

export const dynamic = "force-dynamic";

export default async function TransacoesPage({
  searchParams,
}: {
  searchParams: Promise<{
    tipo?: string | string[];
    q?: string | string[];
    de?: string | string[];
    ate?: string | string[];
  }>;
}) {
  const session = await requireSession();
  const params = await searchParams;
  const tipoRaw = firstParam(params.tipo);
  const tipo = tipoRaw === "income" || tipoRaw === "expense" ? tipoRaw : undefined;
  const q = firstParam(params.q)?.trim();
  const deValue = firstParam(params.de);
  const ateValue = firstParam(params.ate);
  const from = parseLocalDate(deValue);
  const to = parseLocalDate(ateValue);
  const range =
    from && to && from > to
      ? { from: to, to: from }
      : { from, to };

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const [rawTxs, accounts, categories, cards, memberships] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        userId: session.userId,
        type: tipo,
        description: q ? { contains: q, mode: "insensitive" } : undefined,
        date:
          range.from || range.to
            ? {
                gte: range.from ? startOfLocalDay(range.from) : undefined,
                lte: range.to ? endOfLocalDay(range.to) : undefined,
              }
            : undefined,
      },
      include: { category: true, account: true, card: true, toAccount: true },
      orderBy: { date: "desc" },
      take: 200,
    }),
    prisma.account.findMany({ where: { userId: session.userId }, select: { id: true, name: true } }),
    prisma.category.findMany({
      where: { userId: session.userId },
      select: { id: true, name: true, type: true },
    }),
    prisma.creditCard.findMany({ where: { userId: session.userId }, select: { id: true, name: true } }),
    prisma.groupMember.findMany({
      where: { userId: session.userId },
      include: { group: { include: { members: { select: { userId: true } } } } },
    }),
  ]);

  const txs = rawTxs.filter((t) => {
    const key = civilDateKey(t.date);
    if (range.from && key < civilDateKey(range.from)) return false;
    if (range.to && key > civilDateKey(range.to)) return false;
    return true;
  });

  const formOptions: FormOptions = {
    accounts: accounts.map((a) => ({ id: a.id, name: a.name })),
    categories: categories.map((c) => ({ id: c.id, name: c.name, type: c.type })),
    cards: cards.map((c) => ({ id: c.id, name: c.name })),
    groups: memberships.map((m) => ({
      id: m.groupId,
      name: m.group.name,
      memberIds: m.group.members.map((x) => x.userId),
    })),
  };

  const periodLabel =
    range.from && range.to
      ? `de ${formatDate(range.from)} a ${formatDate(range.to)}`
      : range.from
        ? `a partir de ${formatDate(range.from)}`
        : range.to
          ? `até ${formatDate(range.to)}`
          : null;

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
      <div>
        <h1 className="text-2xl font-semibold">Extrato</h1>
        <form action="/transacoes" method="get" className="mt-4 grid gap-2">
          <div className="flex flex-wrap gap-2">
            <input
              name="q"
              defaultValue={q}
              placeholder="Buscar descrição"
              className="h-10 min-w-40 flex-1 rounded-xl border border-line bg-card px-3 text-sm"
            />
            <select
              name="tipo"
              defaultValue={tipo ?? ""}
              className="h-10 rounded-xl border border-line bg-card px-3 text-sm"
            >
              <option value="">Todos</option>
              <option value="expense">Despesas</option>
              <option value="income">Entradas</option>
            </select>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="grid gap-1 text-xs text-muted">
              De
              <DatePicker name="de" defaultValue={range.from ? toInputDate(range.from) : ""} />
            </label>
            <label className="grid gap-1 text-xs text-muted">
              Até
              <DatePicker name="ate" defaultValue={range.to ? toInputDate(range.to) : ""} />
            </label>
            <button className="h-10 rounded-xl bg-primary px-4 text-sm font-medium text-primary-fg">
              Filtrar
            </button>
          </div>
        </form>
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            {
              href: extractHref({ q, tipo, de: toInputDate(monthStart), ate: toInputDate(monthEnd) }),
              label: "Este mês",
            },
            {
              href: extractHref({
                q,
                tipo,
                de: toInputDate(lastMonthStart),
                ate: toInputDate(lastMonthEnd),
              }),
              label: "Mês passado",
            },
            { href: extractHref({ q, tipo }), label: "Todas as datas" },
          ].map((p) => (
            <Link
              key={p.label}
              href={p.href}
              className="rounded-full border border-line px-3 py-1 text-xs font-medium text-muted hover:border-primary hover:text-primary"
            >
              {p.label}
            </Link>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted">
          {txs.length} lançamento{txs.length === 1 ? "" : "s"}
          {periodLabel ? ` ${periodLabel}` : ""}.
        </p>

        <ul className="mt-4 grid gap-2">
          {txs.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-card p-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{t.description}</p>
                <p className="text-xs text-muted">
                  {formatDate(t.date)} ·{" "}
                  {t.type === "transfer"
                    ? `Transferência${t.account ? ` · ${t.account.name}` : ""}${t.toAccount ? ` → ${t.toAccount.name}` : ""}`
                    : t.category?.name ?? "Sem categoria"}{" "}
                  · {PAYMENT_METHODS.find((m) => m.value === t.paymentMethod)?.label ?? t.paymentMethod}
                  {t.card ? ` · ${t.card.name}` : ""}
                  <ReceiptThumb url={t.receiptUrl} />
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {t.status === "pending" && <Badge tone="amber">pendente</Badge>}
                <span
                  className={
                    t.type === "income" ? "text-emerald-600" : t.type === "transfer" ? "text-muted" : "text-rose-600"
                  }
                >
                  <Money
                    cents={t.type === "income" ? t.amount : t.type === "transfer" ? t.amount : -t.amount}
                    signed={t.type !== "transfer"}
                  />
                </span>
                <ConfirmButton label="Duplicar" variant="ghost" action={duplicateTransaction.bind(null, t.id)} />
                <EditTransactionButton
                  options={formOptions}
                  transaction={{
                    id: t.id,
                    type: t.type === "income" ? "income" : t.type === "transfer" ? "transfer" : "expense",
                    amount: t.amount,
                    date: toInputDate(t.date),
                    description: t.description,
                    categoryId: t.categoryId ?? "",
                    accountId: t.accountId ?? "",
                    toAccountId: t.toAccountId ?? "",
                    paymentMethod: t.paymentMethod,
                    cardId: t.cardId ?? "",
                    notes: t.notes ?? "",
                    receiptUrl: t.receiptUrl ?? "",
                  }}
                />
                <ConfirmButton
                  label="Excluir"
                  variant="ghost"
                  action={deleteTransaction.bind(null, t.id)}
                />
              </div>
            </li>
          ))}
          {txs.length === 0 && <p className="text-sm text-muted">Nenhum lançamento encontrado.</p>}
        </ul>
      </div>

      <Card className="h-fit">
        <h2 className="mb-3 text-sm font-semibold">Novo lançamento</h2>
        <TransactionForm options={formOptions} />
      </Card>
    </div>
  );
}
