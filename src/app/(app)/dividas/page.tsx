import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Money } from "@/components/money";
import { DebtForm, PayDebtForm } from "@/components/debt-form";
import { ConfirmButton } from "@/components/confirm-button";
import { deleteDebt } from "@/actions/bills";
import { formatPayoffMonth, projectPayoff } from "@/lib/debt";
import { formatBRL, formatDate } from "@/lib/format";

export default async function DividasPage() {
  const session = await requireSession();
  const debts = await prisma.debt.findMany({
    where: { userId: session.userId },
    orderBy: { nextDueDate: "asc" },
  });

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
      <div className="grid gap-4">
        <h1 className="text-2xl font-semibold">Dívidas</h1>
        <p className="text-sm text-muted">
          Digite um pagamento para ver a nova data de quitação. O último valor pago vira a parcela da previsão.
        </p>
        {debts.map((d) => {
          const remaining = d.totalAmount - d.paidAmount;
          const pct = d.totalAmount > 0 ? Math.min(100, Math.round((d.paidAmount / d.totalAmount) * 100)) : 0;
          const monthly =
            d.monthlyAmount ||
            (d.installments && d.installments > 0 ? Math.round(d.totalAmount / d.installments) : 0);
          const forecast = projectPayoff({
            remaining,
            monthly,
            interestRate: d.interestRate,
            from: d.nextDueDate,
          });
          const done = remaining <= 0;
          return (
            <Card key={d.id}>
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-semibold">{d.creditor}</h2>
                  {d.nextDueDate && !done && (
                    <p className="text-xs text-muted">Próximo vencimento {formatDate(d.nextDueDate)}</p>
                  )}
                  {done && <p className="text-xs text-emerald-600">Quitada</p>}
                </div>
                <ConfirmButton label="Excluir" variant="ghost" action={deleteDebt.bind(null, d.id)} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <p>
                  Pago <Money cents={d.paidAmount} />
                </p>
                <p>
                  Resta <Money cents={Math.max(0, remaining)} />
                </p>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-foreground/10">
                <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-2 text-sm">
                {done ? (
                  <span className="text-emerald-600">100% quitado</span>
                ) : forecast.date ? (
                  <>
                    Quita em <strong>{formatPayoffMonth(forecast.date)}</strong>
                    {forecast.months ? ` · ${forecast.months} parcela${forecast.months === 1 ? "" : "s"}` : ""}
                    {monthly > 0 ? ` de ${formatBRL(monthly)}` : ""}
                  </>
                ) : (
                  <span className="text-muted">Informe um valor em Pagar para ver a previsão.</span>
                )}
              </p>
              <p className="mt-1 text-xs text-muted">
                {pct}% quitado
                {d.interestRate ? ` · ${d.interestRate}% a.m.` : ""}
              </p>
              {!done && (
                <div className="mt-3">
                  <PayDebtForm
                    id={d.id}
                    remaining={remaining}
                    monthlyAmount={monthly}
                    interestRate={d.interestRate}
                    nextDue={d.nextDueDate?.toISOString() ?? null}
                  />
                </div>
              )}
            </Card>
          );
        })}
        {debts.length === 0 && <p className="text-sm text-muted">Nenhuma dívida cadastrada.</p>}
      </div>
      <Card className="h-fit">
        <h2 className="mb-3 text-sm font-semibold">Nova dívida</h2>
        <DebtForm />
      </Card>
    </div>
  );
}
