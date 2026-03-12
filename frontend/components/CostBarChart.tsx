"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { CostEntry } from "@/lib/types";
import { formatDate, formatCurrency } from "@/lib/utils";

interface CostBarChartProps {
  entries: CostEntry[];
}

export default function CostBarChart({ entries }: CostBarChartProps) {
  // Aggregate by date + service
  const byDate = new Map<string, Record<string, number>>();
  const allServices = new Set<string>();

  for (const e of entries) {
    allServices.add(e.service);
    const existing = byDate.get(e.date) || {};
    existing[e.service] = (existing[e.service] || 0) + e.amount;
    byDate.set(e.date, existing);
  }

  // Take top 5 services by total cost
  const serviceTotals = new Map<string, number>();
  for (const e of entries) {
    serviceTotals.set(e.service, (serviceTotals.get(e.service) || 0) + e.amount);
  }
  const topServices = [...serviceTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([s]) => s);

  const data = [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, services]) => ({
      date: formatDate(date),
      ...services,
    }));

  const colors = [
    "#6366f1", "#f97316", "#22c55e", "#3b82f6", "#ec4899",
  ];

  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-[#8b8fa3]">
        No cost data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2e3348" />
        <XAxis dataKey="date" tick={{ fill: "#8b8fa3", fontSize: 11 }} />
        <YAxis
          tick={{ fill: "#8b8fa3", fontSize: 11 }}
          tickFormatter={(v) => `$${v.toFixed(0)}`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#1a1d29",
            border: "1px solid #2e3348",
            borderRadius: "8px",
            color: "#e4e6f0",
            fontSize: 12,
          }}
          formatter={(value: number) => formatCurrency(value)}
        />
        <Legend wrapperStyle={{ fontSize: 11, color: "#8b8fa3" }} />
        {topServices.map((svc, i) => (
          <Bar
            key={svc}
            dataKey={svc}
            stackId="a"
            fill={colors[i % colors.length]}
            radius={i === topServices.length - 1 ? [2, 2, 0, 0] : undefined}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
