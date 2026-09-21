import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  InvestmentAccountForm,
  MoveInvestmentForm,
  UpdatePositionForm,
} from "@/components/investment-forms";
import { Card } from "@/components/ui/card";
import { Money } from "@/components/money";

export const dynamic = "force-dynamic";

export default async function InvestimentosPage() {
  const session = await requireSession();
  const accounts = await prisma.account.findMany({
    where: { userId: session.userId },
    orderBy: { name: "asc" },
  });
  const investments = accounts.filter((a) => a.type === "investment");
  const wallet = accounts.filter((a) => a.type !== "investment").map((a) => ({ id: a.id, name: a.name }));
  const total = investments.reduce((acc, a) => acc + (a.markedValue ?? a.balance), 0);
  const applied = investments.reduce((acc, a) => acc + a.balance, 0);

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
      <div className="grid gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Investimentos</h1>
          <p className="mt-1 text-sm text-muted">
            Controle manual: aporte, resgate e o valor de mercado que você anota. Sem Open Finance.
          </p>
        </div>
        <Card className="border-teal-500/20 bg-teal-500/5">
          <p className="text-sm text-muted">Posição marcada agora</p>
          <p className="mt-1 text-2xl font-semibold tabular">
            <Money cents={total} />
          </p>
          <p className="mt-1 text-xs text-muted">
            Aplicado <Money cents={applied} /> · diferença{" "}
            <Money cents={total - applied} signed />
          </p>
        </Card>
        {investments.map((a) => {
          const marked = a.markedValue ?? a.balance;
          const diff = marked - a.balance;
          return (
            <Card key={a.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">{a.name}</h2>
                  <p className="text-xs text-muted">
                    Aplicado <Money cents={a.balance} />
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold tabular">
                    <Money cents={marked} />
                  </p>
                  <p className={diff >= 0 ? "text-xs text-emerald-600" : "text-xs text-rose-600"}>
                    {diff >= 0 ? "+" : ""}
                    <Money cents={diff} />
                  </p>
                </div>
              </div>
              <div className="mt-3">
                <UpdatePositionForm id={a.id} markedValue={marked} />
              </div>
              <MoveInvestmentForm investmentId={a.id} accounts={wallet} />
            </Card>
          );
        })}
        {investments.length === 0 && (
          <p className="text-sm text-muted">Nenhum investimento ainda. Cadastre o primeiro ao lado.</p>
        )}
      </div>
      <Card className="h-fit">
        <h2 className="mb-3 text-sm font-semibold">Novo investimento</h2>
        <InvestmentAccountForm />
      </Card>
    </div>
  );
}
