"use client";

import { useState } from "react";
import { toast } from "sonner";
import { payCardInvoice } from "@/actions/bills";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Field, Input, Select } from "@/components/ui/field";
import { formatBRLInput, toInputDate } from "@/lib/format";

export function PayInvoiceForm({
  cardId,
  invoice,
  accounts,
}: {
  cardId: string;
  invoice: number;
  accounts: { id: string; name: string }[];
}) {
  const [pending, setPending] = useState(false);
  const today = toInputDate(new Date());

  if (invoice <= 0 || accounts.length === 0) return null;

  return (
    <form
      className="mt-4 grid gap-2 rounded-xl border border-line p-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        const result = await payCardInvoice(new FormData(e.currentTarget));
        setPending(false);
        if (result?.error) toast.error(result.error);
        else toast.success("Fatura paga");
      }}
    >
      <input type="hidden" name="cardId" value={cardId} />
      <p className="text-sm font-medium">Pagar fatura</p>
      <p className="text-xs text-muted">Sai da conta escolhida e abate o valor da fatura.</p>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Valor">
          <Input name="amount" inputMode="decimal" required defaultValue={formatBRLInput(invoice)} />
        </Field>
        <Field label="Data">
          <DatePicker name="date" defaultValue={today} required allowClear={false} />
        </Field>
      </div>
      <Field label="Pagar com">
        <Select name="accountId" defaultValue={accounts[0]?.id ?? ""}>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
      </Field>
      <Button type="submit" disabled={pending} size="sm">
        {pending ? "Pagando..." : "Pagar fatura"}
      </Button>
    </form>
  );
}
