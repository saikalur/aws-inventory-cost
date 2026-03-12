"use client";

import { useEffect, useState } from "react";
import type { GraphNode } from "@/lib/types";
import { SERVICE_COLORS, SERVICE_LABELS } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import { fetchApi } from "@/lib/api";
import type { CostResponse } from "@/lib/types";

interface NodePopupProps {
  node: GraphNode;
  x: number;
  y: number;
  onClose: () => void;
}

export default function NodePopup({ node, x, y, onClose }: NodePopupProps) {
  const [cost, setCost] = useState<number | null>(null);
  const [loadingCost, setLoadingCost] = useState(true);

  useEffect(() => {
    setLoadingCost(true);
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);

    fetchApi<CostResponse>("/api/costs", {
      start_date: thirtyDaysAgo.toISOString().split("T")[0],
      end_date: today.toISOString().split("T")[0],
      service: SERVICE_LABELS[node.service] || node.service,
      region: node.region !== "global" ? node.region : "",
      granularity: "MONTHLY",
    })
      .then((data) => setCost(data.total))
      .catch(() => setCost(null))
      .finally(() => setLoadingCost(false));
  }, [node]);

  const color = SERVICE_COLORS[node.service] || "#6b7280";

  // Keep popup within viewport bounds
  const style: React.CSSProperties = {
    left: Math.min(x, window.innerWidth - 340),
    top: Math.min(y, window.innerHeight - 400),
  };

  return (
    <div
      className="absolute z-50 w-80 rounded-xl border border-[#2e3348] bg-[#1a1d29] shadow-2xl shadow-black/50"
      style={style}
    >
      <div className="flex items-center justify-between border-b border-[#2e3348] px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-xs font-medium uppercase tracking-wider" style={{ color }}>
            {SERVICE_LABELS[node.service] || node.service}
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-[#8b8fa3] transition-colors hover:text-[#e4e6f0]"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="space-y-3 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-[#e4e6f0]">{node.label}</p>
          <p className="text-xs text-[#8b8fa3]">
            {node.resource_type} &middot; {node.region}
          </p>
        </div>

        {/* Cost */}
        <div className="rounded-lg bg-[#252836] px-3 py-2">
          <p className="text-xs text-[#8b8fa3]">30-day Service Cost</p>
          <p className="text-lg font-semibold text-[#e4e6f0]">
            {loadingCost ? (
              <span className="text-sm text-[#8b8fa3]">Loading...</span>
            ) : cost !== null ? (
              formatCurrency(cost)
            ) : (
              <span className="text-sm text-[#8b8fa3]">N/A</span>
            )}
          </p>
        </div>

        {/* Metadata */}
        {Object.entries(node.metadata).length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#8b8fa3]">
              Details
            </p>
            <div className="max-h-40 overflow-y-auto">
              {Object.entries(node.metadata).map(([key, value]) => {
                if (value == null || value === "") return null;
                return (
                  <div key={key} className="flex justify-between py-0.5 text-xs">
                    <span className="text-[#8b8fa3]">{key.replace(/_/g, " ")}</span>
                    <span className="ml-2 truncate text-right text-[#e4e6f0]">
                      {String(value)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-[#2e3348] px-4 py-2">
        <p className="text-center text-[10px] text-[#8b8fa3]">
          ID: {node.id.length > 50 ? node.id.slice(-50) + "..." : node.id}
        </p>
      </div>
    </div>
  );
}
