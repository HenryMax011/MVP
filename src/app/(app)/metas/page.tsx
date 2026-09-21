import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { deleteGoal } from "@/actions/goals";
import { ContributeGoalForm, GoalForm } from "@/components/goal-forms";
import { ConfirmButton } from "@/components/confirm-button";
import { Card } from "@/components/ui/card";
import { Money } from "@/components/money";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function MetasPage() {
  const session = await requireSession();
  const [goals, accounts] = await Promise.all([
    prisma.goal.findMany({
      where: { userId: session.userId },
      include: { account: { select: { name: true, balance: true, markedValue: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.account.findMany({
      where: { userId: session.userId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, type: true },
    }),
  ]);
  const accountOptions = accounts.map((a) => ({ id: a.id, name: a.name }));

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
      <div className="grid gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Metas</h1>
          <p className="mt-1 text-sm text-muted">
            Viagem, reserva, qualquer valor que você queira juntar. Guardar tira da carteira e entra na meta.
          </p>
        </div>
        {goals.map((g) => {
          const saved = g.account ? (g.account.markedValue ?? g.account.balance) : g.savedAmount;
          const pct = g.targetAmount > 0 ? Math.min(100, Math.round((saved / g.targetAmount) * 100)) : 0;
          const done = saved >= g.targetAmount;
          return (
            <Card key={g.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">{g.name}</h2>
                  <p className="text-xs text-muted">
                    {g.account ? `Conta ${g.account.name}` : "Acumulado na meta"}
                    {g.deadline ? ` · até ${formatDate(g.deadline)}` : ""}
                  </p>
                </div>
                <ConfirmButton label="Excluir" variant="ghost" action={deleteGoal.bind(null, g.id)} />
              </div>
              <div className="mt-3 flex justify-between text-sm">
                <span className={done ? "text-emerald-600" : "text-muted"}>
                  <Money cents={saved} /> / <Money cents={g.targetAmount} />
                </span>
                <span className="text-muted">{pct}%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-foreground/10">
                <div
                  className={done ? "h-full bg-emerald-500" : "h-full bg-primary"}
                  style={{ width: `${pct}%`, background: done ? undefined : g.color }}
                />
              </div>
              {g.notes ? <p className="mt-2 text-xs text-muted">{g.notes}</p> : null}
              <ContributeGoalForm goalId={g.id} accounts={accountOptions} />
            </Card>
          );
        })}
        {goals.length === 0 && (
          <p className="text-sm text-muted">Nenhuma meta ainda. Crie a primeira ao lado.</p>
        )}
      </div>
      <Card className="h-fit">
        <h2 className="mb-3 text-sm font-semibold">Nova meta</h2>
        <GoalForm accounts={accountOptions} />
      </Card>
    </div>
  );
}
