import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Money } from "@/components/money";
import {
  AccountEditForm,
  AccountForm,
  BudgetForm,
  CategoryEditForm,
  CategoryForm,
  DeleteAccountButton,
} from "@/components/settings-forms";
import { Button } from "@/components/ui/button";

export default async function ConfigPage() {
  const session = await requireSession();
  const [accounts, categories, budgets] = await Promise.all([
    prisma.account.findMany({
      where: { userId: session.userId },
      orderBy: { name: "asc" },
    }),
    prisma.category.findMany({
      where: { userId: session.userId },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    }),
    prisma.budget.findMany({
      where: { userId: session.userId },
      include: { category: { select: { name: true } } },
    }),
  ]);
  const expenseCategories = categories.filter((c) => c.type === "expense");

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-2xl font-semibold">Ajustes</h1>
        <p className="text-sm text-muted">{session.email}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-sm font-semibold">Contas bancárias</h2>
          <ul className="mb-4 grid gap-3 text-sm">
            {accounts.map((a) => (
              <li key={a.id} className="grid gap-1">
                <div className="flex justify-between">
                  <span>{a.name}</span>
                  <Money cents={a.balance} />
                </div>
                <AccountEditForm account={{ id: a.id, name: a.name, type: a.type }} />
              </li>
            ))}
          </ul>
          <AccountForm />
        </Card>
        <Card>
          <h2 className="mb-3 text-sm font-semibold">Categorias</h2>
          <ul className="mb-4 grid gap-2">
            {categories
              .filter((c) => !c.isDefault)
              .map((c) => (
                <li key={c.id}>
                  <CategoryEditForm category={{ id: c.id, name: c.name }} />
                </li>
              ))}
          </ul>
          <CategoryForm />
        </Card>
      </div>

      <Card>
        <h2 className="mb-2 text-sm font-semibold">Tetos mensais</h2>
        <p className="mb-3 text-xs text-muted">
          Defina um limite por categoria. Aparece no início. Para remover, salve com valor 0.
        </p>
        {budgets.length > 0 && (
          <ul className="mb-4 grid gap-1 text-sm">
            {budgets.map((b) => (
              <li key={b.id} className="flex justify-between">
                <span>{b.category.name}</span>
                <Money cents={b.amount} />
              </li>
            ))}
          </ul>
        )}
        <BudgetForm categories={expenseCategories.map((c) => ({ id: c.id, name: c.name }))} />
      </Card>

      <Card>
        <h2 className="mb-2 text-sm font-semibold">Exportação e LGPD</h2>
        <p className="mb-3 text-sm text-muted">Baixe o extrato em CSV ou abra o relatório para salvar em PDF.</p>
        <div className="flex flex-wrap gap-2">
          <a href="/api/export">
            <Button variant="outline">Baixar CSV</Button>
          </a>
          <Link href="/relatorio">
            <Button variant="outline">Relatório para PDF</Button>
          </Link>
        </div>
        <div className="mt-6 rounded-xl border border-rose-500/30 p-3">
          <p className="mb-2 text-sm">
            Excluir conta remove lançamentos, grupos que você administra e o histórico do assistente.
          </p>
          <DeleteAccountButton />
        </div>
      </Card>
    </div>
  );
}
