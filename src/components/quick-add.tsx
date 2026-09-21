"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { Modal } from "@/components/ui/modal";
import { TransactionForm, type FormOptions } from "@/components/transaction-form";
import { getFormOptions } from "@/actions/transactions";

const emptyOptions: FormOptions = {
  accounts: [],
  categories: [],
  cards: [],
  groups: [],
};

const Ctx = createContext<{ open: () => void }>({ open: () => undefined });

export function useQuickAdd() {
  return useContext(Ctx);
}

export function QuickAddProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<FormOptions>(emptyOptions);
  const [loading, setLoading] = useState(false);

  async function openModal() {
    setOpen(true);
    setLoading(true);
    try {
      setOptions(await getFormOptions());
    } finally {
      setLoading(false);
    }
  }

  return (
    <Ctx.Provider value={{ open: openModal }}>
      {children}
      <Modal open={open} title="Novo lançamento" onClose={() => setOpen(false)}>
        {loading ? (
          <p className="text-sm text-muted">Carregando formulário...</p>
        ) : (
          <TransactionForm compact options={options} onDone={() => setOpen(false)} />
        )}
      </Modal>
    </Ctx.Provider>
  );
}
