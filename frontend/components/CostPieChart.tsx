"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import type { CostEntry } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

interface CostPieChartProps {
  entries: CostEntry[];
}

const COLORS = [
  "#6366f1", "#f97316", "#22c55e", "#3b82f6", "#ec4899",
  "#14b8a6", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4",
];

export default function CostPieChart({ entries }: CostPieChartProps) {
  // Aggregate by service
  const byService = new Map<string, number>();
  for (const e of entries) {
    byService.set(e.service, (byService.get(e.service) || 0) + e.amount);
  }

  const data = [...byService.entries()]
    .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);

  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-[#8b8fa3]">
        No cost data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={70}
          outerRadius={120}
          paddingAngle={2}
          dataKey="value"
          nameKey="name"
        >
          {data.map((_, index) => (
            <Cell key={index} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: "#1a1d29",
            border: "1px solid #2e3348",
            borderRadius: "8px",
            fontSize: 12,
          }}
          itemStyle={{ color: "#e4e6f0" }}
          labelStyle={{ color: "#8b8fa3" }}
          formatter={(value: number) => formatCurrency(value)}
        />
        <Legend
          wrapperStyle={{ fontSize: 11, color: "#8b8fa3" }}
          formatter={(value: string) =>
            value.length > 30 ? value.slice(0, 30) + "..." : value
          }
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
