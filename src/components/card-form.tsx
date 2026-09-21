"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createCard, updateCard } from "@/actions/bills";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { CARD_BRANDS } from "@/lib/constants";
import { formatBRLInput } from "@/lib/format";

export function CardForm({
  initial,
}: {
  initial?: {
    id: string;
    name: string;
    brand: string;
    limit: number;
    closingDay: number;
    dueDay: number;
  };
}) {
  const [pending, setPending] = useState(false);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const form = e.currentTarget;
    const result = initial ? await updateCard(new FormData(form)) : await createCard(new FormData(form));
    setPending(false);
    if (result?.error) toast.error(result.error);
    else {
      toast.success(initial ? "Cartão atualizado" : "Cartão cadastrado");
      if (!initial) form.reset();
    }
  }
  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      {initial ? <input type="hidden" name="id" value={initial.id} /> : null}
      <Field label="Nome">
        <Input name="name" required placeholder="Nubank, Inter..." defaultValue={initial?.name} />
      </Field>
      <Field label="Bandeira">
        <Select name="brand" defaultValue={initial?.brand ?? "mastercard"}>
          {CARD_BRANDS.map((b) => (
            <option key={b.value} value={b.value}>
              {b.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Limite">
        <Input
          name="limit"
          inputMode="decimal"
          required
          placeholder="0,00"
          defaultValue={initial ? formatBRLInput(initial.limit) : ""}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Fechamento">
          <Input name="closingDay" type="number" min={1} max={28} defaultValue={initial?.closingDay ?? 10} />
        </Field>
        <Field label="Vencimento">
          <Input name="dueDay" type="number" min={1} max={28} defaultValue={initial?.dueDay ?? 17} />
        </Field>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Salvando..." : initial ? "Salvar cartão" : "Adicionar cartão"}
      </Button>
    </form>
  );
}
