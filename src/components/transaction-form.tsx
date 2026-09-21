"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { createTransaction, updateTransaction } from "@/actions/transactions";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { PAYMENT_METHODS, TX_RECURRENCE } from "@/lib/constants";
import { ReceiptInput } from "@/components/receipt-input";
import { formatBRLInput, toInputDate } from "@/lib/format";

export type FormOptions = {
  accounts: { id: string; name: string }[];
  categories: { id: string; name: string; type: string }[];
  cards: { id: string; name: string }[];
  groups: { id: string; name: string; memberIds: string[] }[];
};

export type TransactionInitial = {
  id: string;
  type: "income" | "expense" | "transfer";
  amount: number;
  date: string;
  description: string;
  categoryId: string;
  accountId: string;
  toAccountId?: string;
  paymentMethod: string;
  cardId: string;
  notes: string;
  receiptUrl?: string;
};

export function TransactionForm({
  options,
  defaultType = "expense",
  compact = false,
  initial,
  onDone,
}: {
  options: FormOptions;
  defaultType?: "income" | "expense" | "transfer";
  compact?: boolean;
  initial?: TransactionInitial;
  onDone?: () => void;
}) {
  const editing = Boolean(initial);
  const [type, setType] = useState<"income" | "expense" | "transfer">(initial?.type ?? defaultType);
  const [method, setMethod] = useState(initial?.paymentMethod || "pix");
  const [recurring, setRecurring] = useState(false);
  const [shared, setShared] = useState(false);
  const [pending, setPending] = useState(false);
  const today = useMemo(() => toInputDate(new Date()), []);
  const cats = options.categories.filter((c) => c.type === type);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.set("type", type);
    const result = editing ? await updateTransaction(fd) : await createTransaction(fd);
    setPending(false);
    if (result?.error) {
      toast.error(result.error);
      return;
    }
    toast.success(
      editing
        ? "Lançamento atualizado"
        : type === "income"
          ? "Entrada registrada"
          : type === "transfer"
            ? "Transferência feita"
            : "Despesa registrada",
    );
    if (!editing) form.reset();
    onDone?.();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      {initial ? <input type="hidden" name="id" value={initial.id} /> : null}
      <div className="grid grid-cols-3 gap-1 rounded-xl bg-foreground/5 p-1">
        {(
          [
            ["expense", "Despesa"],
            ["income", "Entrada"],
            ["transfer", "Transferir"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setType(value)}
            className={`h-9 rounded-lg text-sm font-medium ${type === value ? "bg-card shadow-sm" : ""}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Valor">
          <Input
            name="amount"
            inputMode="decimal"
            placeholder="0,00"
            defaultValue={initial ? formatBRLInput(initial.amount) : ""}
            required
          />
        </Field>
        <Field label="Data">
          <DatePicker name="date" defaultValue={initial?.date ?? today} required allowClear={false} />
        </Field>
      </div>

      <Field label="Descrição">
        <Input
          name="description"
          placeholder={
            type === "income" ? "Salário, Pix..." : type === "transfer" ? "Pix entre contas" : "Almoço, Uber..."
          }
          defaultValue={initial?.description}
          required
        />
      </Field>

      {type === "transfer" ? (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Sai de">
            <Select name="accountId" defaultValue={initial?.accountId || options.accounts[0]?.id || ""}>
              {options.accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Entra em">
            <Select
              name="toAccountId"
              defaultValue={initial?.toAccountId || options.accounts[1]?.id || options.accounts[0]?.id || ""}
            >
              {options.accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Categoria">
            <Select key={`${type}-${initial?.id ?? "new"}`} name="categoryId" defaultValue={initial?.categoryId ?? ""}>
              <option value="">Sem categoria</option>
              {cats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Conta">
            <Select name="accountId" defaultValue={initial?.accountId || options.accounts[0]?.id || ""}>
              {options.accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      )}

      {type === "expense" && (
        <Field label="Forma de pagamento">
          <Select name="paymentMethod" value={method} onChange={(e) => setMethod(e.target.value)}>
            {PAYMENT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Select>
        </Field>
      )}

      {type === "expense" && method === "credit" && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Cartão">
            <Select name="cardId" defaultValue={initial?.cardId || options.cards[0]?.id || ""}>
              {options.cards.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          {!editing && (
            <Field label="Parcelas">
              <Input name="installments" type="number" min={1} max={24} defaultValue={1} />
            </Field>
          )}
        </div>
      )}

      {!compact && !editing && (
        <>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="isRecurring"
              className="h-4 w-4 accent-emerald-600"
              checked={recurring}
              onChange={(e) => setRecurring(e.target.checked)}
            />
            Repetir automaticamente
          </label>
          {recurring && (
            <Field label="Frequência">
              <Select name="recurrence" defaultValue="monthly">
                {TX_RECURRENCE.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          <Field label="Observação">
            <Textarea name="notes" placeholder="Detalhes..." defaultValue={initial?.notes} />
          </Field>
        </>
      )}

      {!compact && editing && (
        <Field label="Observação">
          <Textarea name="notes" placeholder="Detalhes..." defaultValue={initial?.notes} />
        </Field>
      )}

      <Field label="Foto do comprovante">
        <ReceiptInput defaultUrl={initial?.receiptUrl} />
      </Field>

      {!editing && type === "expense" && options.groups.length > 0 && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4 accent-emerald-600"
            checked={shared}
            onChange={(e) => setShared(e.target.checked)}
          />
          Despesa compartilhada
        </label>
      )}

      {shared && (
        <div className="grid gap-3 rounded-xl border border-line p-3">
          <Field label="Grupo">
            <Select name="groupId" defaultValue={options.groups[0]?.id ?? ""}>
              {options.groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Divisão">
            <Select name="splitType" defaultValue="equal">
              <option value="equal">Igual</option>
              <option value="percent">Por percentual</option>
              <option value="custom">Valores customizados</option>
            </Select>
          </Field>
        </div>
      )}

      <Button type="submit" disabled={pending} className="mt-1 w-full">
        {pending ? "Salvando..." : editing ? "Salvar alterações" : type === "transfer" ? "Transferir" : "Salvar lançamento"}
      </Button>
    </form>
  );
}
