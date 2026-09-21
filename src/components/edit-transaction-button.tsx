"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { TransactionForm, type FormOptions, type TransactionInitial } from "@/components/transaction-form";

export function EditTransactionButton({
  transaction,
  options,
}: {
  transaction: TransactionInitial;
  options: FormOptions;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
        Editar
      </Button>
      <Modal open={open} title="Editar lançamento" onClose={() => setOpen(false)}>
        <p className="mb-4 text-sm text-muted">Mude o valor, a data ou a descrição sem excluir o lançamento.</p>
        <TransactionForm
          key={transaction.id}
          options={options}
          initial={transaction}
          onDone={() => setOpen(false)}
        />
      </Modal>
    </>
  );
}
