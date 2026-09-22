import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getGroupBalances, getGroupTransfers } from "@/lib/finance";
import { Card } from "@/components/ui/card";
import { Money } from "@/components/money";
import { SharedExpenseForm, SettleForm } from "@/components/group-forms";
import { ConfirmButton } from "@/components/confirm-button";
import { deleteSharedExpense } from "@/actions/groups";
import { formatDate } from "@/lib/format";
import { CopyInvite } from "@/components/copy-invite";
import { appUrl } from "@/lib/app-url";

export default async function GrupoPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;
  const group = await prisma.group.findUnique({
    where: { id },
    include: {
      members: { include: { user: true } },
      expenses: { include: { paidBy: true, splits: { include: { user: true } } }, orderBy: { date: "desc" } },
      settlements: { include: { from: true, to: true }, orderBy: { date: "desc" } },
    },
  });
  if (!group) notFound();
  const membership = group.members.find((m) => m.userId === session.userId);
  if (!membership) notFound();

  const balances = await getGroupBalances(group.id);
  const transfers = await getGroupTransfers(group.id);
  const others = group.members.filter((m) => m.userId !== session.userId).map((m) => ({ id: m.userId, name: m.user.name }));

  return (
    <div className="grid gap-5">
      <div>
        <p className="text-sm text-muted">Convite do grupo</p>
        <h1 className="text-2xl font-semibold">{group.name}</h1>
        <CopyInvite code={group.inviteCode} url={`${await appUrl()}/grupos/entrar/${group.inviteCode}`} />
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {balances.map((b) => (
          <Card key={b.userId}>
            <p className="text-sm text-muted">{b.name}</p>
            <p className={`text-xl font-semibold ${b.net >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
              <Money cents={b.net} signed />
            </p>
          </Card>
        ))}
      </div>

      <Card>
        <h2 className="mb-3 text-sm font-semibold">Como acertar (mínimo de transferências)</h2>
        {transfers.length === 0 ? (
          <p className="text-sm text-muted">Ninguém deve para ninguém neste momento.</p>
        ) : (
          <ul className="grid gap-2 text-sm">
            {transfers.map((t) => (
              <li key={`${t.fromId}-${t.toId}`} className="flex justify-between">
                <span>
                  <strong>{t.fromName}</strong> deve para <strong>{t.toName}</strong>
                </span>
                <Money cents={t.amount} />
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div>
          <h2 className="mb-2 text-sm font-semibold">Despesas compartilhadas</h2>
          <ul className="grid gap-2">
            {group.expenses.map((e) => (
              <li key={e.id} className="rounded-2xl border border-line bg-card p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{e.description}</p>
                    <p className="text-xs text-muted">
                      {formatDate(e.date)} · {e.paidBy.name} pagou · divisão {e.splitType}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {e.splits.map((s) => `${s.user.name} ${ (s.amount / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`).join(" · ")}
                    </p>
                  </div>
                  <div className="text-right">
                    <Money cents={e.amount} />
                    {(membership.role === "admin" || e.paidById === session.userId) && (
                      <div className="mt-1">
                        <ConfirmButton
                          label="Excluir"
                          variant="ghost"
                          action={deleteSharedExpense.bind(null, group.id, e.id)}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <h2 className="mb-2 mt-6 text-sm font-semibold">Histórico de acertos</h2>
          <ul className="grid gap-2 text-sm">
            {group.settlements.map((s) => (
              <li key={s.id} className="flex justify-between rounded-xl border border-line bg-card p-3">
                <span>
                  {s.from.name} pagou {s.to.name} · {formatDate(s.date)}
                </span>
                <Money cents={s.amount} />
              </li>
            ))}
            {group.settlements.length === 0 && <p className="text-sm text-muted">Nenhum acerto ainda.</p>}
          </ul>
        </div>

        <div className="grid gap-4">
          <Card>
            <h2 className="mb-3 text-sm font-semibold">Nova despesa do grupo</h2>
            <SharedExpenseForm
              groupId={group.id}
              members={group.members.map((m) => ({ id: m.userId, name: m.user.name }))}
            />
          </Card>
          <Card>
            <h2 className="mb-3 text-sm font-semibold">Acerto de contas</h2>
            <SettleForm groupId={group.id} members={others} />
          </Card>
        </div>
      </div>
    </div>
  );
}
