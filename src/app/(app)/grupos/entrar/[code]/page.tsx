import { notFound, redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { JoinGroupButton } from "@/components/join-group-button";

export default async function JoinGroupPage({ params }: { params: Promise<{ code: string }> }) {
  const session = await requireSession();
  const { code } = await params;
  const group = await prisma.group.findUnique({
    where: { inviteCode: code.trim().toUpperCase() },
    include: { members: true },
  });
  if (!group) notFound();

  const already = group.members.some((m) => m.userId === session.userId);
  if (already) redirect(`/grupos/${group.id}`);

  return (
    <div className="mx-auto max-w-md">
      <Card>
        <h1 className="text-xl font-semibold">Convite para {group.name}</h1>
        <p className="mt-2 text-sm text-muted">
          Você foi convidado a entrar neste grupo. Só o saldo entre vocês fica visível — nunca o extrato pessoal de
          outra pessoa.
        </p>
        <div className="mt-4">
          <JoinGroupButton code={group.inviteCode} />
        </div>
      </Card>
    </div>
  );
}
