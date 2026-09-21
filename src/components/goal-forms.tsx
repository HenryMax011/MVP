"use client";

import { useState } from "react";
import { toast } from "sonner";
import { contributeGoal, createGoal } from "@/actions/goals";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { toInputDate } from "@/lib/format";

export function GoalForm({ accounts }: { accounts: { id: string; name: string }[] }) {
  const [pending, setPending] = useState(false);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const form = e.currentTarget;
    const result = await createGoal(new FormData(form));
    setPending(false);
    if (result?.error) toast.error(result.error);
    else {
      toast.success("Meta criada");
      form.reset();
    }
  }
  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      <Field label="Nome">
        <Input name="name" required placeholder="Viagem, reserva..." />
      </Field>
      <Field label="Quanto você quer juntar">
        <Input name="targetAmount" inputMode="decimal" required placeholder="0,00" />
      </Field>
      <Field label="Prazo">
        <DatePicker name="deadline" />
      </Field>
      <Field label="Conta desta reserva">
        <Select name="accountId" defaultValue="">
          <option value="">Sem conta (só o acumulado)</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Observação">
        <Textarea name="notes" placeholder="Opcional" />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "Salvando..." : "Criar meta"}
      </Button>
    </form>
  );
}

export function ContributeGoalForm({
  goalId,
  accounts,
}: {
  goalId: string;
  accounts: { id: string; name: string }[];
}) {
  const [pending, setPending] = useState(false);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const form = e.currentTarget;
    const result = await contributeGoal(new FormData(form));
    setPending(false);
    if (result?.error) toast.error(result.error);
    else {
      toast.success("Valor guardado");
      form.reset();
    }
  }
  return (
    <form onSubmit={onSubmit} className="mt-3 grid gap-2">
      <input type="hidden" name="goalId" value={goalId} />
      <div className="grid grid-cols-2 gap-2">
        <Field label="Guardar">
          <Input name="amount" inputMode="decimal" required placeholder="0,00" />
        </Field>
        <Field label="Data">
          <DatePicker name="date" defaultValue={toInputDate(new Date())} allowClear={false} />
        </Field>
      </div>
      <Field label="Sai de">
        <Select name="fromAccountId" defaultValue={accounts[0]?.id ?? ""}>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
      </Field>
      <Button type="submit" size="sm" disabled={pending || accounts.length === 0}>
        {pending ? "Guardando..." : "Guardar"}
      </Button>
    </form>
  );
}
