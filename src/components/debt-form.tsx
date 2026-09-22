"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { createDebt, payDebtInstallment } from "@/actions/bills";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Field, Input, Textarea } from "@/components/ui/field";
import { formatPayoffMonth, projectPayoff } from "@/lib/debt";
import { formatBRL, parseBRLToCents, toInputDate } from "@/lib/format";

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
        <Field label="Parcela / mês">
          <Input name="monthlyAmount" inputMode="decimal" placeholder="500,00" />
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

export function PayDebtForm({
  id,
  remaining,
  monthlyAmount,
  interestRate,
  nextDue,
}: {
  id: string;
  remaining: number;
  monthlyAmount: number;
  interestRate?: number | null;
  nextDue?: string | null;
}) {
  const [pending, setPending] = useState(false);
  const [raw, setRaw] = useState("");
  const typed = parseBRLToCents(raw);
  const monthly = typed > 0 ? typed : monthlyAmount;
  const preview = useMemo(() => {
    const from = nextDue ? new Date(nextDue) : new Date();
    return projectPayoff({ remaining, monthly, interestRate, from });
  }, [remaining, monthly, interestRate, nextDue]);

  return (
    <form
      className="grid gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setPending(true);
        const result = await payDebtInstallment(id, String(fd.get("amount") ?? ""));
        setPending(false);
        if (result?.error) toast.error(result.error);
        else {
          toast.success("Pagamento registrado");
          setRaw("");
        }
      }}
    >
      <div className="flex gap-2">
        <Input
          name="amount"
          inputMode="decimal"
          placeholder="Valor do pagamento"
          className="h-9"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
        />
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "..." : "Pagar"}
        </Button>
      </div>
      {remaining > 0 && monthly > 0 && preview.date && (
        <p className="text-xs text-muted">
          Pagando {formatBRL(monthly)} por mês, quita em{" "}
          <span className="font-medium text-foreground">{formatPayoffMonth(preview.date)}</span>
          {preview.months ? ` · ${preview.months} parcela${preview.months === 1 ? "" : "s"}` : ""}
        </p>
      )}
      {preview.stuck && (
        <p className="text-xs text-rose-600">
          Esse valor não cobre os juros. Aumente o pagamento para a dívida fechar.
        </p>
      )}
    </form>
  );
}
