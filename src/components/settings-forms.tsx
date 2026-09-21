"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createAccount, createCategory, updateAccount, updateCategory, upsertBudget } from "@/actions/transactions";
import { deleteAccount } from "@/actions/settings";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { ACCOUNT_TYPES } from "@/lib/constants";

export function AccountForm() {
  const [pending, setPending] = useState(false);
  return (
    <form
      className="grid gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        const form = e.currentTarget;
        const result = await createAccount(new FormData(form));
        setPending(false);
        if (result?.error) toast.error(result.error);
        else {
          toast.success("Conta criada");
          form.reset();
        }
      }}
    >
      <Field label="Nome">
        <Input name="name" required />
      </Field>
      <Field label="Tipo">
        <Select name="type" defaultValue="checking">
          {ACCOUNT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Saldo inicial">
        <Input name="balance" inputMode="decimal" defaultValue="0" />
      </Field>
      <Button type="submit" disabled={pending}>
        Adicionar conta
      </Button>
    </form>
  );
}

export function CategoryForm() {
  const [pending, setPending] = useState(false);
  return (
    <form
      className="grid gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        const form = e.currentTarget;
        const result = await createCategory(new FormData(form));
        setPending(false);
        if (result?.error) toast.error(result.error);
        else {
          toast.success("Categoria criada");
          form.reset();
        }
      }}
    >
      <Field label="Nome">
        <Input name="name" required />
      </Field>
      <Field label="Tipo">
        <Select name="type" defaultValue="expense">
          <option value="expense">Despesa</option>
          <option value="income">Entrada</option>
        </Select>
      </Field>
      <Button type="submit" disabled={pending}>
        Adicionar categoria
      </Button>
    </form>
  );
}

export function AccountEditForm({
  account,
}: {
  account: { id: string; name: string; type: string };
}) {
  const [pending, setPending] = useState(false);
  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        const result = await updateAccount(new FormData(e.currentTarget));
        setPending(false);
        if (result?.error) toast.error(result.error);
        else toast.success("Conta atualizada");
      }}
    >
      <input type="hidden" name="id" value={account.id} />
      <Input name="name" required defaultValue={account.name} className="h-9 w-40" />
      <Select name="type" defaultValue={account.type} className="h-9 w-40">
        {ACCOUNT_TYPES.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </Select>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "..." : "Salvar"}
      </Button>
    </form>
  );
}

export function CategoryEditForm({ category }: { category: { id: string; name: string } }) {
  const [pending, setPending] = useState(false);
  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        const result = await updateCategory(new FormData(e.currentTarget));
        setPending(false);
        if (result?.error) toast.error(result.error);
        else toast.success("Categoria atualizada");
      }}
    >
      <input type="hidden" name="id" value={category.id} />
      <Input name="name" required defaultValue={category.name} className="h-9 w-40" />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "..." : "Salvar"}
      </Button>
    </form>
  );
}

export function BudgetForm({
  categories,
}: {
  categories: { id: string; name: string }[];
}) {
  const [pending, setPending] = useState(false);
  return (
    <form
      className="grid gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        const result = await upsertBudget(new FormData(e.currentTarget));
        setPending(false);
        if (result?.error) toast.error(result.error);
        else toast.success("Teto salvo. Valor 0 remove o limite.");
      }}
    >
      <Field label="Categoria">
        <Select name="categoryId" defaultValue={categories[0]?.id ?? ""}>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Teto do mês">
        <Input name="amount" inputMode="decimal" required placeholder="400,00" />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "Salvando..." : "Definir teto"}
      </Button>
    </form>
  );
}

export function DeleteAccountButton() {
  const [pending, setPending] = useState(false);
  return (
    <Button
      variant="danger"
      disabled={pending}
      onClick={async () => {
        if (!confirm("Isso apaga todos os seus dados em definitivo. Continuar?")) return;
        setPending(true);
        await deleteAccount();
      }}
    >
      {pending ? "Excluindo..." : "Excluir minha conta"}
    </Button>
  );
}
