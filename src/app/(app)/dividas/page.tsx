import { addMonths } from "date-fns";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Money } from "@/components/money";
import { DebtForm, PayDebtForm } from "@/components/debt-form";
import { ConfirmButton } from "@/components/confirm-button";
import { deleteDebt } from "@/actions/bills";
import { formatDate } from "@/lib/format";

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
        {debts.map((d) => {
          const remaining = d.totalAmount - d.paidAmount;
          const pct = Math.round((d.paidAmount / d.totalAmount) * 100);
          const monthly =
            d.installments && d.installments > 0
              ? Math.round(d.totalAmount / d.installments)
              : remaining;
          const monthsLeft = monthly > 0 ? Math.ceil(remaining / monthly) : 0;
          const projected =
            d.nextDueDate && monthsLeft > 0 ? addMonths(d.nextDueDate, Math.max(monthsLeft - 1, 0)) : null;
          return (
            <Card key={d.id}>
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-semibold">{d.creditor}</h2>
                  {d.nextDueDate && (
                    <p className="text-xs text-muted">Próximo vencimento {formatDate(d.nextDueDate)}</p>
                  )}
                </div>
                <ConfirmButton label="Excluir" variant="ghost" action={deleteDebt.bind(null, d.id)} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <p>
                  Pago <Money cents={d.paidAmount} />
                </p>
                <p>
                  Resta <Money cents={remaining} />
                </p>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-foreground/10">
                <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-1 text-xs text-muted">
                {pct}% quitado
                {projected ? ` · previsão ${formatDate(projected)}` : ""}
                {d.interestRate ? ` · ${d.interestRate}% a.m.` : ""}
              </p>
              <div className="mt-3">
                <PayDebtForm id={d.id} />
              </div>
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
