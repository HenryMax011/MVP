"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { addSharedExpense, createGroup, joinGroup, settleUp } from "@/actions/groups";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { toInputDate } from "@/lib/format";

export function CreateGroupForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <form
      className="grid gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        const result = await createGroup(new FormData(e.currentTarget));
        setPending(false);
        if (result?.error) toast.error(result.error);
        else if (result?.id) router.push(`/grupos/${result.id}`);
      }}
    >
      <Field label="Nome do grupo">
        <Input name="name" required placeholder="Apartamento, viagem..." />
      </Field>
      <Field label="Descrição">
        <Textarea name="description" />
      </Field>
      <Button type="submit" disabled={pending}>
        Criar grupo
      </Button>
    </form>
  );
}

export function JoinGroupForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <form
      className="grid gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        const result = await joinGroup(new FormData(e.currentTarget));
        setPending(false);
        if (result?.error) toast.error(result.error);
        else if (result?.id) router.push(`/grupos/${result.id}`);
      }}
    >
      <Field label="Código de convite">
        <Input name="inviteCode" required placeholder="ABC12XYZ" className="uppercase" />
      </Field>
      <Button type="submit" variant="outline" disabled={pending}>
        Entrar
      </Button>
    </form>
  );
}

export function SharedExpenseForm({
  groupId,
  members,
}: {
  groupId: string;
  members: { id: string; name: string }[];
}) {
  const [pending, setPending] = useState(false);
  const today = toInputDate(new Date());
  return (
    <form
      className="grid gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        const result = await addSharedExpense(groupId, new FormData(e.currentTarget));
        setPending(false);
        if (result?.error) toast.error(result.error);
        else {
          toast.success("Despesa adicionada");
          e.currentTarget.reset();
        }
      }}
    >
      <Field label="Descrição">
        <Input name="description" required />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Valor">
          <Input name="amount" inputMode="decimal" required />
        </Field>
        <Field label="Data">
          <DatePicker name="date" defaultValue={today} required allowClear={false} />
        </Field>
      </div>
      <Field label="Quem pagou">
        <Select name="paidById" defaultValue={members[0]?.id}>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </Select>
      </Field>
      <Button type="submit" disabled={pending}>
        Registrar no grupo
      </Button>
    </form>
  );
}

export function SettleForm({
  groupId,
  members,
}: {
  groupId: string;
  members: { id: string; name: string }[];
}) {
  const [pending, setPending] = useState(false);
  return (
    <form
      className="grid gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        const result = await settleUp(groupId, new FormData(e.currentTarget));
        setPending(false);
        if (result?.error) toast.error(result.error);
        else toast.success("Acerto registrado");
      }}
    >
      <Field label="Pagar para">
        <Select name="toId" required>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Valor">
        <Input name="amount" inputMode="decimal" required />
      </Field>
      <Button type="submit" variant="outline" disabled={pending}>
        Marcar acerto
      </Button>
    </form>
  );
}
