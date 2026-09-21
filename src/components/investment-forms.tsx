"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  createInvestmentAccount,
  moveInvestment,
  updateInvestmentPosition,
} from "@/actions/investments";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Field, Input, Select } from "@/components/ui/field";
import { formatBRLInput, toInputDate } from "@/lib/format";

export function InvestmentAccountForm() {
  const [pending, setPending] = useState(false);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const form = e.currentTarget;
    const result = await createInvestmentAccount(new FormData(form));
    setPending(false);
    if (result?.error) toast.error(result.error);
    else {
      toast.success("Investimento criado");
      form.reset();
    }
  }
  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      <Field label="Nome">
        <Input name="name" required placeholder="Tesouro, CDB, fundo..." />
      </Field>
      <Field label="Valor aplicado agora">
        <Input name="balance" inputMode="decimal" defaultValue="0" />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "Salvando..." : "Adicionar investimento"}
      </Button>
    </form>
  );
}

export function UpdatePositionForm({
  id,
  markedValue,
}: {
  id: string;
  markedValue: number;
}) {
  const [pending, setPending] = useState(false);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const result = await updateInvestmentPosition(new FormData(e.currentTarget));
    setPending(false);
    if (result?.error) toast.error(result.error);
    else toast.success("Posição atualizada");
  }
  return (
    <form onSubmit={onSubmit} className="grid grid-cols-[1fr_auto] items-end gap-2">
      <input type="hidden" name="id" value={id} />
      <Field label="Quanto está valendo hoje">
        <Input name="markedValue" inputMode="decimal" defaultValue={formatBRLInput(markedValue)} required />
      </Field>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "..." : "Atualizar"}
      </Button>
    </form>
  );
}

export function MoveInvestmentForm({
  investmentId,
  accounts,
}: {
  investmentId: string;
  accounts: { id: string; name: string }[];
}) {
  const [pending, setPending] = useState(false);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const form = e.currentTarget;
    const result = await moveInvestment(new FormData(form));
    setPending(false);
    if (result?.error) toast.error(result.error);
    else {
      toast.success("Movimentação registrada");
      form.reset();
    }
  }
  return (
    <form onSubmit={onSubmit} className="mt-3 grid gap-2">
      <input type="hidden" name="investmentId" value={investmentId} />
      <div className="grid grid-cols-2 gap-2">
        <Field label="Tipo">
          <Select name="kind" defaultValue="deposit">
            <option value="deposit">Aporte</option>
            <option value="withdraw">Resgate</option>
          </Select>
        </Field>
        <Field label="Valor">
          <Input name="amount" inputMode="decimal" required placeholder="0,00" />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Conta da carteira">
          <Select name="otherId" defaultValue={accounts[0]?.id ?? ""}>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Data">
          <DatePicker name="date" defaultValue={toInputDate(new Date())} allowClear={false} />
        </Field>
      </div>
      <Button type="submit" size="sm" disabled={pending || accounts.length === 0}>
        {pending ? "Registrando..." : "Registrar"}
      </Button>
    </form>
  );
}
