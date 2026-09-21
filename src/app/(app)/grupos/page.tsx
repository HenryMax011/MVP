import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getGroupBalances } from "@/lib/finance";
import { Card } from "@/components/ui/card";
import { Money } from "@/components/money";
import { CreateGroupForm, JoinGroupForm } from "@/components/group-forms";

export default async function GruposPage() {
  const session = await requireSession();
  const memberships = await prisma.groupMember.findMany({
    where: { userId: session.userId },
    include: { group: { include: { members: true } } },
    orderBy: { joinedAt: "desc" },
  });

  const cards = [];
  const nets = await Promise.all(memberships.map((m) => getGroupBalances(m.groupId)));
  memberships.forEach((m, i) => {
    const mine = nets[i]?.find((b) => b.userId === session.userId);
    cards.push({ ...m, net: mine?.net ?? 0 });
  });

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
      <div>
        <h1 className="text-2xl font-semibold">Grupos</h1>
        <p className="text-sm text-muted">Só o saldo entre vocês aparece — nunca o extrato pessoal de outra pessoa.</p>
        <ul className="mt-4 grid gap-3">
          {cards.map((m) => (
            <Link key={m.groupId} href={`/grupos/${m.groupId}`}>
              <Card className="transition hover:border-primary/40">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="font-semibold">{m.group.name}</h2>
                    <p className="text-xs text-muted">
                      {m.group.members.length} pessoas · você é {m.role === "admin" ? "admin" : "membro"}
                    </p>
                  </div>
                  <span className={m.net >= 0 ? "text-emerald-600" : "text-rose-600"}>
                    {m.net >= 0 ? "a receber " : "deve "}
                    <Money cents={Math.abs(m.net)} />
                  </span>
                </div>
              </Card>
            </Link>
          ))}
          {cards.length === 0 && (
            <p className="text-sm text-muted">Crie um grupo ou entre com um código / link de convite.</p>
          )}
        </ul>
      </div>
      <div className="grid gap-4">
        <Card>
          <h2 className="mb-3 text-sm font-semibold">Novo grupo</h2>
          <CreateGroupForm />
        </Card>
        <Card>
          <h2 className="mb-3 text-sm font-semibold">Entrar com código</h2>
          <JoinGroupForm />
        </Card>
      </div>
    </div>
  );
}
