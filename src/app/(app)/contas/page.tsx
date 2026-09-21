import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, Badge } from "@/components/ui/card";
import { Money } from "@/components/money";
import { BillForm } from "@/components/bill-form";
import { ConfirmButton } from "@/components/confirm-button";
import { deleteBill, payBill } from "@/actions/bills";
import { formatDate, toInputDate } from "@/lib/format";

export default async function ContasPage() {
  const session = await requireSession();
  const bills = await prisma.bill.findMany({
    where: { userId: session.userId },
    include: { category: true },
    orderBy: { dueDate: "asc" },
  });
  const categories = await prisma.category.findMany({
    where: { userId: session.userId, type: "expense" },
  });
  const accounts = await prisma.account.findMany({ where: { userId: session.userId } });
  const pending = bills.filter((b) => b.status === "pending");
  const paid = bills.filter((b) => b.status === "paid");

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
      <div className="grid gap-5">
        <div>
          <h1 className="text-2xl font-semibold">Contas a pagar</h1>
          <p className="text-sm text-muted">Marcar como paga gera uma despesa automaticamente.</p>
        </div>
        <section>
          <h2 className="mb-2 text-sm font-semibold">Pendentes</h2>
          <ul className="grid gap-2">
            {pending.map((b) => {
              const soon = b.dueDate.getTime() - Date.now() < 1000 * 60 * 60 * 24 * 3;
              return (
                <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-line bg-card p-3">
                  <div>
                    <p className="font-medium">{b.name}</p>
                    <p className="text-xs text-muted">
                      {b.category?.name ?? "Contas"} · vence {formatDate(b.dueDate)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {soon && <Badge tone="amber">perto do vencimento</Badge>}
                    <Money cents={b.amount} />
                    <ConfirmButton label="Pagar" action={payBill.bind(null, b.id)} />
                    <ConfirmButton label="Excluir" variant="ghost" action={deleteBill.bind(null, b.id)} />
                  </div>
                  <details className="w-full text-sm">
                    <summary className="cursor-pointer text-xs text-muted">Editar</summary>
                    <div className="mt-3">
                      <BillForm
                        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
                        accounts={accounts.map((a) => ({ id: a.id, name: a.name }))}
                        initial={{
                          id: b.id,
                          name: b.name,
                          amount: b.amount,
                          dueDate: toInputDate(b.dueDate),
                          categoryId: b.categoryId ?? "",
                          accountId: b.accountId ?? "",
                          recurrence: b.recurrence,
                        }}
                      />
                    </div>
                  </details>
                </li>
              );
            })}
            {pending.length === 0 && <p className="text-sm text-muted">Nada pendente. Ótimo.</p>}
          </ul>
        </section>
        <section>
          <h2 className="mb-2 text-sm font-semibold">Histórico</h2>
          <ul className="grid gap-2">
            {paid.map((b) => (
              <li key={b.id} className="flex items-center justify-between rounded-2xl border border-line bg-card p-3 text-sm">
                <span>
                  {b.name} · pago em {b.paidAt ? formatDate(b.paidAt) : "—"}
                </span>
                <Money cents={b.amount} />
              </li>
            ))}
          </ul>
        </section>
      </div>
      <Card className="h-fit">
        <h2 className="mb-3 text-sm font-semibold">Nova conta</h2>
        <BillForm
          categories={categories.map((c) => ({ id: c.id, name: c.name }))}
          accounts={accounts.map((a) => ({ id: a.id, name: a.name }))}
        />
      </Card>
    </div>
  );
}
