import { requireSession } from "@/lib/auth";
import { getDashboardData } from "@/lib/finance";
import { prisma } from "@/lib/db";
import { formatBRL, formatDate, monthLabel } from "@/lib/format";
import { PrintButton } from "@/components/print-button";

export default async function RelatorioPage() {
  const session = await requireSession();
  const data = await getDashboardData(session.userId);
  const txs = await prisma.transaction.findMany({
    where: { userId: session.userId },
    include: { category: true },
    orderBy: { date: "desc" },
    take: 200,
  });

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <h1 className="text-2xl font-semibold">Relatório</h1>
        <PrintButton />
      </div>
      <article className="rounded-2xl border border-line bg-card p-6">
        <h1 className="text-xl font-semibold">Financias — {session.name}</h1>
        <p className="text-sm text-muted">{monthLabel(new Date())}</p>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>Saldo: {formatBRL(data.available)}</div>
          <div>Entradas: {formatBRL(data.income)}</div>
          <div>Despesas: {formatBRL(data.expenses)}</div>
          <div>Sobra: {formatBRL(data.leftover)}</div>
        </dl>
        <h2 className="mt-6 text-sm font-semibold">Por categoria</h2>
        <ul className="mt-2 text-sm">
          {data.byCategory.map((c) => (
            <li key={c.name} className="flex justify-between border-b border-line py-1">
              <span>{c.name}</span>
              <span>{formatBRL(c.amount)}</span>
            </li>
          ))}
        </ul>
        <h2 className="mt-6 text-sm font-semibold">Lançamentos</h2>
        <table className="mt-2 w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line">
              <th className="py-1">Data</th>
              <th>Descrição</th>
              <th>Categoria</th>
              <th className="text-right">Valor</th>
            </tr>
          </thead>
          <tbody>
            {txs.map((t) => (
              <tr key={t.id} className="border-b border-line">
                <td className="py-1">{formatDate(t.date)}</td>
                <td>{t.description}</td>
                <td>{t.category?.name ?? "—"}</td>
                <td className="text-right">
                  {t.type === "income" ? "+" : "-"}
                  {formatBRL(t.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>
    </div>
  );
}
