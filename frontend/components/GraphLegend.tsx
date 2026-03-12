"use client";

import { SERVICE_COLORS, SERVICE_LABELS } from "@/lib/constants";

interface GraphLegendProps {
  services: string[];
}

export default function GraphLegend({ services }: GraphLegendProps) {
  return (
    <div className="absolute bottom-4 left-4 z-10 rounded-lg border border-[#2e3348] bg-[#1a1d29]/90 p-3 backdrop-blur-sm">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#8b8fa3]">
        Services
      </p>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {services.map((svc) => (
          <div key={svc} className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: SERVICE_COLORS[svc] || "#6b7280" }}
            />
            <span className="text-xs text-[#e4e6f0]">
              {SERVICE_LABELS[svc] || svc}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
