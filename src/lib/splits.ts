export type PersonBalance = {
  userId: string;
  name: string;
  net: number;
};

export type Transfer = {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amount: number;
};

export function simplifyDebts(people: PersonBalance[]): Transfer[] {
  const debtors = people
    .filter((p) => p.net < -1)
    .map((p) => ({ ...p, net: p.net }))
    .sort((a, b) => a.net - b.net);
  const creditors = people
    .filter((p) => p.net > 1)
    .map((p) => ({ ...p, net: p.net }))
    .sort((a, b) => b.net - a.net);

  const transfers: Transfer[] = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const amount = Math.min(-debtor.net, creditor.net);

    if (amount > 0) {
      transfers.push({
        fromId: debtor.userId,
        fromName: debtor.name,
        toId: creditor.userId,
        toName: creditor.name,
        amount,
      });
    }

    debtor.net += amount;
    creditor.net -= amount;

    if (debtor.net >= -1) i += 1;
    if (creditor.net <= 1) j += 1;
  }

  return transfers;
}
