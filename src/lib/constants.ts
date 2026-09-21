export const EXPENSE_CATEGORIES = [
  { name: "Alimentação", icon: "utensils", color: "#f97316" },
  { name: "Mercado", icon: "shopping-cart", color: "#22c55e" },
  { name: "Transporte", icon: "car", color: "#3b82f6" },
  { name: "Moradia", icon: "home", color: "#8b5cf6" },
  { name: "Lazer", icon: "sparkles", color: "#ec4899" },
  { name: "Assinaturas", icon: "repeat", color: "#6366f1" },
  { name: "Saúde", icon: "heart-pulse", color: "#ef4444" },
  { name: "Educação", icon: "graduation-cap", color: "#14b8a6" },
  { name: "Compras", icon: "shopping-bag", color: "#eab308" },
  { name: "Viagem", icon: "plane", color: "#06b6d4" },
  { name: "Contas", icon: "receipt", color: "#64748b" },
  { name: "Outros", icon: "tag", color: "#94a3b8" },
] as const;

export const INCOME_CATEGORIES = [
  { name: "Salário", icon: "briefcase", color: "#059669" },
  { name: "Pix", icon: "zap", color: "#10b981" },
  { name: "Transferência", icon: "arrow-left-right", color: "#0d9488" },
  { name: "Freelance", icon: "laptop", color: "#0284c7" },
  { name: "Venda", icon: "badge-dollar-sign", color: "#65a30d" },
  { name: "Reembolso", icon: "undo-2", color: "#7c3aed" },
  { name: "Outros", icon: "plus-circle", color: "#64748b" },
] as const;

export const PAYMENT_METHODS = [
  { value: "pix", label: "Pix" },
  { value: "debit", label: "Débito" },
  { value: "credit", label: "Crédito" },
  { value: "cash", label: "Dinheiro" },
  { value: "boleto", label: "Boleto" },
] as const;

export const ACCOUNT_TYPES = [
  { value: "checking", label: "Conta corrente" },
  { value: "savings", label: "Poupança" },
  { value: "cash", label: "Carteira / dinheiro" },
  { value: "pix", label: "Conta Pix" },
  { value: "investment", label: "Investimento" },
] as const;

export const CARD_BRANDS = [
  { value: "visa", label: "Visa" },
  { value: "mastercard", label: "Mastercard" },
  { value: "elo", label: "Elo" },
  { value: "amex", label: "American Express" },
  { value: "hipercard", label: "Hipercard" },
  { value: "other", label: "Outra" },
] as const;

export const BILL_RECURRENCE = [
  { value: "once", label: "Única" },
  { value: "monthly", label: "Mensal" },
  { value: "yearly", label: "Anual" },
] as const;

export const TX_RECURRENCE = [
  { value: "weekly", label: "Semanal" },
  { value: "monthly", label: "Mensal" },
  { value: "yearly", label: "Anual" },
] as const;
