"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createDebt, payDebtInstallment } from "@/actions/bills";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Field, Input, Textarea } from "@/components/ui/field";
import { toInputDate } from "@/lib/format";

export function DebtForm() {
  const [pending, setPending] = useState(false);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const form = e.currentTarget;
    const result = await createDebt(new FormData(form));
    setPending(false);
    if (result?.error) toast.error(result.error);
    else {
      toast.success("Dívida cadastrada");
      form.reset();
    }
  }
  const today = toInputDate(new Date());
  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      <Field label="Credor">
        <Input name="creditor" required placeholder="Banco, amigo..." />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Valor total">
          <Input name="totalAmount" inputMode="decimal" required />
        </Field>
        <Field label="Já pago">
          <Input name="paidAmount" inputMode="decimal" defaultValue="0" />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Juros % a.m.">
          <Input name="interestRate" inputMode="decimal" placeholder="opcional" />
        </Field>
        <Field label="Parcelas">
          <Input name="installments" type="number" min={1} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Início">
          <DatePicker name="startDate" defaultValue={today} allowClear={false} />
        </Field>
        <Field label="Próximo vencimento">
          <DatePicker name="nextDueDate" />
        </Field>
      </div>
      <Field label="Notas">
        <Textarea name="notes" />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "Salvando..." : "Adicionar dívida"}
      </Button>
    </form>
  );
}

export function PayDebtForm({ id }: { id: string }) {
  const [pending, setPending] = useState(false);
  return (
    <form
      className="flex gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setPending(true);
        const result = await payDebtInstallment(id, String(fd.get("amount") ?? ""));
        setPending(false);
        if (result?.error) toast.error(result.error);
      }}
    >
      <Input name="amount" inputMode="decimal" placeholder="Pagar" className="h-9 w-28" />
      <Button type="submit" size="sm" disabled={pending}>
        Registrar
      </Button>
    </form>
  );
}
