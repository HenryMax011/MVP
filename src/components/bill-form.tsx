"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createBill, updateBill } from "@/actions/bills";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Field, Input, Select } from "@/components/ui/field";
import { formatBRLInput, toInputDate } from "@/lib/format";
import { BILL_RECURRENCE } from "@/lib/constants";

export function BillForm({
  categories,
  accounts,
  initial,
}: {
  categories: { id: string; name: string }[];
  accounts: { id: string; name: string }[];
  initial?: {
    id: string;
    name: string;
    amount: number;
    dueDate: string;
    categoryId: string;
    accountId: string;
    recurrence: string;
  };
}) {
  const [pending, setPending] = useState(false);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const form = e.currentTarget;
    const result = initial ? await updateBill(new FormData(form)) : await createBill(new FormData(form));
    setPending(false);
    if (result?.error) toast.error(result.error);
    else {
      toast.success(initial ? "Conta atualizada" : "Conta cadastrada");
      if (!initial) form.reset();
    }
  }
  const today = toInputDate(new Date());
  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      {initial ? <input type="hidden" name="id" value={initial.id} /> : null}
      <Field label="Nome">
        <Input name="name" required placeholder="Aluguel, luz, internet..." defaultValue={initial?.name} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Valor">
          <Input
            name="amount"
            inputMode="decimal"
            required
            placeholder="0,00"
            defaultValue={initial ? formatBRLInput(initial.amount) : ""}
          />
        </Field>
        <Field label="Vencimento">
          <DatePicker name="dueDate" defaultValue={initial?.dueDate ?? today} required allowClear={false} />
        </Field>
      </div>
      <Field label="Recorrência">
        <Select name="recurrence" defaultValue={initial?.recurrence ?? "monthly"}>
          {BILL_RECURRENCE.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Categoria">
        <Select name="categoryId" defaultValue={initial?.categoryId ?? ""}>
          <option value="">Sem categoria</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Conta de pagamento">
        <Select name="accountId" defaultValue={initial?.accountId || accounts[0]?.id || ""}>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "Salvando..." : initial ? "Salvar conta" : "Adicionar conta"}
      </Button>
    </form>
  );
}
