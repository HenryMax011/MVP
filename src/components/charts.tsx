"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatBRL } from "@/lib/format";
import { Card, CardTitle } from "@/components/ui/card";
import { PAYMENT_METHODS } from "@/lib/constants";

const tooltipStyle = {
  background: "var(--card)",
  border: "1px solid var(--line)",
  borderRadius: 12,
};

export function CategoryChart({
  data,
}: {
  data: { name: string; color: string; amount: number }[];
}) {
  const chart = data.map((d) => ({ ...d, value: d.amount / 100 }));
  return (
    <Card className="h-full">
      <CardTitle>Gastos por categoria</CardTitle>
      {chart.length === 0 ? (
        <p className="mt-8 text-sm text-muted">Sem despesas neste período.</p>
      ) : (
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={chart} dataKey="value" nameKey="name" innerRadius={58} outerRadius={84} paddingAngle={3}>
                {chart.map((d) => (
                  <Cell key={d.name} fill={d.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => formatBRL(Math.round(Number(v ?? 0) * 100))} contentStyle={tooltipStyle} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

export function EvolutionChart({
  data,
}: {
  data: { label: string; income: number; expenses: number }[];
}) {
  const chart = data.map((d) => ({
    label: d.label,
    Entradas: d.income / 100,
    Despesas: d.expenses / 100,
  }));
  return (
    <Card className="h-full">
      <CardTitle>Evolução em 6 meses</CardTitle>
      <div className="mt-4 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chart}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v) => formatBRL(Math.round(Number(v ?? 0) * 100))} contentStyle={tooltipStyle} />
            <Legend />
            <Line type="monotone" dataKey="Entradas" stroke="#0284c7" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Despesas" stroke="#e11d48" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export function ComparisonChart({
  currentIncome,
  currentExpenses,
  lastIncome,
  lastExpenses,
}: {
  currentIncome: number;
  currentExpenses: number;
  lastIncome: number;
  lastExpenses: number;
}) {
  const data = [
    { name: "Entradas", Atual: currentIncome / 100, Anterior: lastIncome / 100 },
    { name: "Despesas", Atual: currentExpenses / 100, Anterior: lastExpenses / 100 },
  ];
  return (
    <Card>
      <CardTitle>Período atual vs. anterior</CardTitle>
      <div className="mt-4 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v) => formatBRL(Math.round(Number(v ?? 0) * 100))} contentStyle={tooltipStyle} />
            <Legend />
            <Bar dataKey="Atual" fill="#0c8a5d" radius={[6, 6, 0, 0]} />
            <Bar dataKey="Anterior" fill="#94a3b8" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export function MethodChart({ data }: { data: { method: string; amount: number }[] }) {
  const chart = data.map((d) => ({
    name: PAYMENT_METHODS.find((m) => m.value === d.method)?.label ?? d.method,
    value: d.amount / 100,
  }));
  const colors = ["#0c8a5d", "#0284c7", "#7c3aed", "#f59e0b", "#e11d48"];
  return (
    <Card>
      <CardTitle>Por forma de pagamento</CardTitle>
      {chart.length === 0 ? (
        <p className="mt-8 text-sm text-muted">Sem dados neste período.</p>
      ) : (
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => formatBRL(Math.round(Number(v ?? 0) * 100))} contentStyle={tooltipStyle} />
              <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                {chart.map((d, i) => (
                  <Cell key={d.name} fill={colors[i % colors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
