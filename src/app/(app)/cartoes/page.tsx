import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getCardCycle, dueDateForCycle, inRange, signedCardAmount } from "@/lib/cards";
import { Card } from "@/components/ui/card";
import { Money } from "@/components/money";
import { CardForm } from "@/components/card-form";
import { CreditCardArt } from "@/components/credit-card-art";
import { ConfirmButton } from "@/components/confirm-button";
import { deleteCard } from "@/actions/bills";
import { PayInvoiceForm } from "@/components/pay-invoice-form";
import { civilDateKey, formatDate } from "@/lib/format";

export default async function CartoesPage() {
  const session = await requireSession();
  const [cards, cardTxs, accounts] = await Promise.all([
    prisma.creditCard.findMany({ where: { userId: session.userId } }),
    prisma.transaction.findMany({
      where: { userId: session.userId, cardId: { not: null } },
      select: { id: true, amount: true, date: true, cardId: true, description: true, paymentMethod: true },
    }),
    prisma.account.findMany({
      where: { userId: session.userId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  const now = new Date();

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
      <div className="grid gap-6">
        <h1 className="text-2xl font-semibold">Cartões de crédito</h1>
        {cards.map((card) => {
          const { cycleStart, cycleEnd } = getCardCycle(card.closingDay, now);
          const transactions = cardTxs.filter((t) => t.cardId === card.id);
          const invoice = Math.max(
            0,
            transactions
              .filter((t) => inRange(t.date, cycleStart, cycleEnd))
              .reduce((acc, t) => acc + signedCardAmount(t.paymentMethod, t.amount), 0),
          );
          const used = Math.max(
            0,
            transactions
              .filter((t) => civilDateKey(t.date) >= civilDateKey(cycleStart))
              .reduce((acc, t) => acc + signedCardAmount(t.paymentMethod, t.amount), 0),
          );
          const pct = Math.min(100, Math.round((used / card.creditLimit) * 100));
          const due = dueDateForCycle(cycleEnd, card.dueDay);
          const future = transactions.filter((t) => civilDateKey(t.date) > civilDateKey(cycleEnd));
          return (
            <div key={card.id} className="grid gap-3">
              <CreditCardArt
                name={card.name}
                brand={card.brand}
                color={card.color}
                holder={session.name}
              />
              <div className="max-w-[420px] rounded-2xl border border-line bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="grid flex-1 gap-3 sm:grid-cols-3">
                    <div>
                      <p className="text-xs text-muted">Fatura atual</p>
                      <p className="text-lg font-semibold">
                        <Money cents={invoice} />
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted">Disponível</p>
                      <p className="text-lg font-semibold">
                        <Money cents={card.creditLimit - used} />
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted">Vencimento</p>
                      <p className="text-lg font-semibold">{formatDate(due)}</p>
                    </div>
                  </div>
                  <ConfirmButton label="Excluir" variant="ghost" action={deleteCard.bind(null, card.id)} />
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-foreground/10">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                </div>
                <p className="mt-1 text-xs text-muted">
                  {pct}% do limite de <Money cents={card.creditLimit} /> usado
                </p>
                <PayInvoiceForm
                  cardId={card.id}
                  invoice={invoice}
                  accounts={accounts}
                />
                <details className="mt-3 text-sm">
                  <summary className="cursor-pointer text-xs text-muted">Editar cartão</summary>
                  <div className="mt-3">
                    <CardForm
                      initial={{
                        id: card.id,
                        name: card.name,
                        brand: card.brand,
                        limit: card.creditLimit,
                        closingDay: card.closingDay,
                        dueDay: card.dueDay,
                      }}
                    />
                  </div>
                </details>
                {future.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-semibold uppercase text-muted">Faturas futuras</p>
                    <ul className="mt-2 grid gap-1 text-sm">
                      {future.map((t) => (
                        <li key={t.id} className="flex justify-between">
                          <span>
                            {t.description} · {formatDate(t.date)}
                          </span>
                          <Money cents={t.amount} />
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {cards.length === 0 && <p className="text-sm text-muted">Cadastre um cartão para acompanhar limite e fatura.</p>}
      </div>
      <Card className="h-fit">
        <h2 className="mb-3 text-sm font-semibold">Novo cartão</h2>
        <CardForm />
      </Card>
    </div>
  );
}
