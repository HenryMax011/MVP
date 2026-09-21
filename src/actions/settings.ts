"use server";

import { prisma } from "@/lib/db";
import { requireSession, clearSessionCookie } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function exportTransactionsCsv() {
  const session = await requireSession();
  const txs = await prisma.transaction.findMany({
    where: { userId: session.userId },
    include: { category: true, account: true, card: true },
    orderBy: { date: "desc" },
  });

  const header = ["data", "tipo", "descricao", "categoria", "valor", "pagamento", "conta", "cartao", "status"];
  const rows = txs.map((t) =>
    [
      t.date.toISOString().slice(0, 10),
      t.type,
      `"${t.description.replace(/"/g, '""')}"`,
      t.category?.name ?? "",
      (t.amount / 100).toFixed(2).replace(".", ","),
      t.paymentMethod,
      t.account?.name ?? "",
      t.card?.name ?? "",
      t.status,
    ].join(";"),
  );
  return [header.join(";"), ...rows].join("\n");
}

export async function deleteAccount() {
  const session = await requireSession();
  await prisma.user.delete({ where: { id: session.userId } });
  await clearSessionCookie();
  redirect("/");
}
