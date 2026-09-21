import Link from "next/link";
import { endOfMonth, startOfMonth } from "date-fns";
import { requireSession } from "@/lib/auth";
import { getDashboardData } from "@/lib/finance";
import { formatBRL, formatDate, formatPeriodLabel, parseLocalDate, toInputDate } from "@/lib/format";
import { Money } from "@/components/money";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/card";
import { PeriodFilter } from "@/components/period-filter";
import { CategoryChart, ComparisonChart, EvolutionChart, MethodChart } from "@/components/charts";
import { cn } from "@/lib/cn";

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ de?: string | string[]; ate?: string | string[] }>;
}) {
  const session = await requireSession();
  const params = await searchParams;
  const now = new Date();
  const from = parseLocalDate(firstParam(params.de)) ?? startOfMonth(now);
  const to = parseLocalDate(firstParam(params.ate)) ?? endOfMonth(now);
  const range = from <= to ? { from, to } : { from: to, to: from };
  const data = await getDashboardData(session.userId, range);
  const periodLabel = formatPeriodLabel(data.from, data.to);
  const leftoverPositive = data.leftover >= 0;

  return (
    <div className="grid gap-5 rise">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Como está o seu dinheiro</h1>
        <p className="mt-1 text-sm text-muted">
          Olhando de {formatDate(data.from)} até {formatDate(data.to)}.
        </p>
      </div>

      <PeriodFilter from={toInputDate(data.from)} to={toInputDate(data.to)} />

      <Card className="border-primary/20 bg-primary/5">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">Em uma frase</p>
        <p className="mt-2 text-lg leading-snug">
          Em {periodLabel} você recebeu <strong>{formatBRL(data.income)}</strong>, gastou{" "}
          <strong>{formatBRL(data.expenses)}</strong> e{" "}
          {leftoverPositive ? "sobrou" : "faltou"} <strong>{formatBRL(Math.abs(data.leftover))}</strong>.
        </p>
        <p className="mt-3 text-sm text-muted">
          Entrou e Saiu mudam com as datas. A carteira abaixo é o dinheiro de hoje, independente do filtro.
        </p>
      </Card>

      <section className="grid gap-3">
        <h2 className="text-sm font-semibold">Conta deste período</h2>
        <p className="text-xs text-muted">
          Todos os lançamentos pagos entre {formatDate(data.from)} e {formatDate(data.to)}, inclusive os que ainda vão acontecer.
        </p>
        <div className="grid gap-3 lg:grid-cols-[1fr_auto_1fr_auto_1fr]">
          <Card className="border-emerald-500/20 bg-emerald-500/5">
            <p className="text-sm text-muted">1. Entrou</p>
            <p className="mt-1 text-3xl font-semibold tabular text-emerald-700 dark:text-emerald-400">
              <Money cents={data.income} />
            </p>
            <p className="mt-2 text-xs text-muted">Salário, pix recebido, vendas — o que veio para você.</p>
          </Card>
          <p className="hidden items-center justify-center text-2xl font-semibold text-muted lg:flex">−</p>
          <Card className="border-rose-500/20 bg-rose-500/5">
            <p className="text-sm text-muted">2. Saiu</p>
            <p className="mt-1 text-3xl font-semibold tabular text-rose-700 dark:text-rose-400">
              <Money cents={data.expenses} />
            </p>
            <p className="mt-2 text-xs text-muted">Compras, contas pagas, pix enviados — o que você gastou.</p>
          </Card>
          <p className="hidden items-center justify-center text-2xl font-semibold text-muted lg:flex">=</p>
          <Card className={leftoverPositive ? "border-emerald-500/20" : "border-rose-500/20"}>
            <p className="text-sm text-muted">3. {leftoverPositive ? "Sobrou" : "Faltou"}</p>
            <p
              className={cn(
                "mt-1 text-3xl font-semibold tabular",
                leftoverPositive ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400",
              )}
            >
              <Money cents={data.leftover} />
            </p>
            <p className="mt-2 text-xs text-muted">
              {formatBRL(data.income)} − {formatBRL(data.expenses)}
            </p>
          </Card>
        </div>
      </section>

      <section className="grid gap-3">
        <h2 className="text-sm font-semibold">O que você tem agora</h2>
        <p className="text-xs text-muted">
          Este bloco não usa o filtro de datas. É o saldo real até hoje.
        </p>
        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
          <Card>
            <p className="text-sm text-muted">Na carteira agora</p>
            <p className="mt-1 text-2xl font-semibold tabular">
              <Money cents={data.available} />
            </p>
            <ul className="mt-3 grid gap-1.5 text-sm">
              {data.accounts.map((a) => (
                <li key={a.id} className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-muted">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: a.color }} />
                    {a.name}
                  </span>
                  <Money cents={a.balance} />
                </li>
              ))}
              {data.accounts.length === 0 && <li className="text-muted">Nenhuma conta cadastrada.</li>}
            </ul>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted">Investido</p>
              <Link href="/investimentos" className="text-xs text-primary">
                Abrir
              </Link>
            </div>
            <p className="mt-1 text-2xl font-semibold tabular text-teal-700 dark:text-teal-400">
              <Money cents={data.invested} />
            </p>
            <ul className="mt-3 grid gap-1.5 text-sm">
              {data.investmentAccounts.map((a) => (
                <li key={a.id} className="flex items-center justify-between">
                  <span className="text-muted">{a.name}</span>
                  <Money cents={a.markedValue ?? a.balance} />
                </li>
              ))}
              {data.investmentAccounts.length === 0 && (
                <li className="text-muted">Nenhum investimento cadastrado.</li>
              )}
            </ul>
          </Card>
          <Card>
            <p className="text-sm text-muted">Ainda vai sair (boletos)</p>
            <p className="mt-1 text-2xl font-semibold tabular text-amber-600">
              <Money cents={data.pendingBills} />
            </p>
            <p className="mt-2 text-xs text-muted">
              Contas cadastradas e não pagas. Ainda não saíram da carteira.
            </p>
          </Card>
          <Card>
            <p className="text-sm text-muted">No cartão de crédito</p>
            <p className="mt-1 text-2xl font-semibold tabular text-violet-600">
              <Money cents={data.cardDebt} />
            </p>
            <p className="mt-2 text-xs text-muted">
              Fatura atual. Só sai da carteira quando você pagar o cartão.
            </p>
          </Card>
        </div>
      </section>

      {data.goals.length > 0 && (
        <section className="grid gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Metas</h2>
            <Link href="/metas" className="text-xs text-primary">
              Ver todas
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {data.goals.map((g) => {
              const pct = g.targetAmount > 0 ? Math.min(100, Math.round((g.saved / g.targetAmount) * 100)) : 0;
              const done = g.saved >= g.targetAmount;
              return (
                <Card key={g.id}>
                  <div className="flex items-center justify-between text-sm">
                    <span>{g.name}</span>
                    <span className={done ? "text-emerald-600" : "text-muted"}>
                      <Money cents={g.saved} /> / <Money cents={g.targetAmount} />
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-foreground/10">
                    <div
                      className={done ? "h-full bg-emerald-500" : "h-full bg-primary"}
                      style={{ width: `${pct}%`, background: done ? undefined : g.color }}
                    />
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {data.goals.length === 0 && (
        <p className="text-xs text-muted">
          Quer juntar para uma viagem ou reserva? Crie em{" "}
          <Link href="/metas" className="text-primary">
            Metas
          </Link>
          .
        </p>
      )}

      {data.budgets.length === 0 && (
        <p className="text-xs text-muted">
          Quer um teto de gasto por categoria? Defina em{" "}
          <Link href="/configuracoes" className="text-primary">
            Ajustes
          </Link>
          .
        </p>
      )}
      {data.budgets.length > 0 && (
        <section className="grid gap-3">
          <h2 className="text-sm font-semibold">Tetos deste mês</h2>
          <p className="text-xs text-muted">Quanto você já gastou em cada categoria com limite.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {data.budgets.map((b) => {
              const pct = b.amount > 0 ? Math.min(100, Math.round((b.used / b.amount) * 100)) : 0;
              const over = b.used > b.amount;
              return (
                <Card key={b.id}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: b.color }} />
                      {b.name}
                    </span>
                    <span className={over ? "text-rose-600" : "text-muted"}>
                      <Money cents={b.used} /> / <Money cents={b.amount} />
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-foreground/10">
                    <div
                      className={over ? "h-full bg-rose-500" : "h-full bg-primary"}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {data.scheduled.length > 0 && (
        <Card>
          <h2 className="text-sm font-semibold">Agendado — ainda não caiu / ainda não saiu</h2>
          <p className="mt-1 text-xs text-muted">
            Estes lançamentos têm data futura, então ainda não mexem na carteira.
          </p>
          <ul className="mt-3 grid gap-2 text-sm">
            {data.scheduled
              .slice()
              .sort((a, b) => a.date.getTime() - b.date.getTime())
              .map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3">
                  <span>
                    {formatDate(t.date)} · {t.description}
                  </span>
                  <span
                    className={
                      t.type === "income" ? "text-emerald-600" : t.type === "transfer" ? "text-muted" : "text-rose-600"
                    }
                  >
                    <Money cents={t.type === "income" ? t.amount : t.type === "transfer" ? t.amount : -t.amount} signed={t.type !== "transfer"} />
                  </span>
                </li>
              ))}
          </ul>
        </Card>
      )}

      {data.recentTx.length === 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <h2 className="font-semibold">Nenhum lançamento nestas datas</h2>
          <p className="mt-1 text-sm text-muted">
            Não há entradas nem saídas pagas de {formatDate(data.from)} a {formatDate(data.to)}. Troque o período ou
            registre um lançamento no +.
          </p>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Gastou hoje", hint: "Só o dia de hoje, independente do filtro.", value: data.todayExpenses },
          { label: "Gastou nesta semana", hint: "De segunda a domingo desta semana.", value: data.weekExpenses },
          { label: "Gastou neste mês", hint: "Do dia 1 até agora, no calendário.", value: data.monthExpenses },
        ].map((item) => (
          <Card key={item.label}>
            <p className="text-sm text-muted">{item.label}</p>
            <p className="mt-1 text-lg font-semibold">
              <Money cents={item.value} />
            </p>
            <p className="mt-1 text-xs text-muted">{item.hint}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <CategoryChart data={data.byCategory} />
        <EvolutionChart data={data.months} />
        <ComparisonChart
          currentIncome={data.income}
          currentExpenses={data.expenses}
          lastIncome={data.lastIncome}
          lastExpenses={data.lastExpenses}
        />
        <MethodChart data={data.byMethod} />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Contas a pagar</h2>
            <Link href="/contas" className="text-xs text-primary">
              Ver todas
            </Link>
          </div>
          {data.upcomingBills.length === 0 ? (
            <p className="text-sm text-muted">Nenhuma conta pendente.</p>
          ) : (
            <ul className="grid gap-2">
              {data.upcomingBills.map((b) => (
                <li key={b.id} className="flex items-center justify-between text-sm">
                  <span>{b.name}</span>
                  <span className="flex items-center gap-2">
                    <Badge tone="amber">vence {b.dueDate.toLocaleDateString("pt-BR")}</Badge>
                    <Money cents={b.amount} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Grupos</h2>
            <Link href="/grupos" className="text-xs text-primary">
              Abrir
            </Link>
          </div>
          {data.groupSummaries.length === 0 ? (
            <p className="text-sm text-muted">Você ainda não entrou em um grupo.</p>
          ) : (
            <ul className="grid gap-2">
              {data.groupSummaries.map((g) => (
                <li key={g.id} className="flex items-center justify-between text-sm">
                  <span>{g.name}</span>
                  <span className={g.net >= 0 ? "text-emerald-600" : "text-rose-600"}>
                    {g.net >= 0 ? "a receber " : "você deve "}
                    <Money cents={Math.abs(g.net)} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">O que entrou e saiu nestas datas</h2>
            <p className="text-xs text-muted">
              {data.recentTx.length} lançamento{data.recentTx.length === 1 ? "" : "s"} no período escolhido.
            </p>
          </div>
          <Link href="/transacoes" className="text-xs text-primary">
            Ver extrato
          </Link>
        </div>
        <ul className="grid gap-2">
          {data.recentTx.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 text-sm">
              <div>
                <p className="font-medium">{t.description}</p>
                <p className="text-xs text-muted">
                  {formatDate(t.date)} · {t.type === "transfer" ? "Transferência" : t.category?.name ?? "Sem categoria"}
                </p>
              </div>
              <span
                className={
                  t.type === "income" ? "text-emerald-600" : t.type === "transfer" ? "text-muted" : "text-rose-600"
                }
              >
                <Money cents={t.type === "income" ? t.amount : t.type === "transfer" ? t.amount : -t.amount} signed={t.type !== "transfer"} />
              </span>
            </li>
          ))}
          {data.recentTx.length === 0 && (
            <p className="text-sm text-muted">Nenhum lançamento neste intervalo.</p>
          )}
        </ul>
      </Card>
    </div>
  );
}
