"use client";

import { useState } from "react";
import { useCosts } from "@/hooks/useCosts";
import { useConfig } from "@/hooks/useConfig";
import { useProfile } from "@/lib/ProfileContext";
import { useAccount } from "@/hooks/useAccount";
import ServiceFilter from "./ServiceFilter";
import CostBarChart from "./CostBarChart";
import CostPieChart from "./CostPieChart";
import LoadingSpinner from "./LoadingSpinner";
import { formatCurrency } from "@/lib/utils";
import { exportCosts } from "@/lib/exportXlsx";

export default function CostDashboard() {
  const today = new Date().toISOString().split("T")[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000)
    .toISOString()
    .split("T")[0];

  const [startDate, setStartDate] = useState(thirtyDaysAgo);
  const [endDate, setEndDate] = useState(today);
  const [service, setService] = useState("");
  const [region, setRegion] = useState("");
  const [granularity, setGranularity] = useState("DAILY");

  const { profile } = useProfile();
  const { data: accountData } = useAccount();
  const { data: config } = useConfig(profile);
  const { data, isLoading, error } = useCosts({
    profile,
    startDate,
    endDate,
    service,
    region,
    granularity,
  });

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-6 py-4 text-sm text-red-400">
          Failed to load cost data. Make sure Cost Explorer is enabled in your AWS account.
        </div>
      </div>
    );
  }

  // Collect unique services from entries for filter dropdown
  const entryServices = data
    ? [...new Set(data.entries.map((e) => e.service))].sort()
    : [];
  const entryRegions = data
    ? [...new Set(data.entries.map((e) => e.region))].sort()
    : [];

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-6">
      <ServiceFilter
        startDate={startDate}
        endDate={endDate}
        service={service}
        region={region}
        granularity={granularity}
        availableServices={entryServices}
        availableRegions={config?.regions || entryRegions}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onServiceChange={setService}
        onRegionChange={setRegion}
        onGranularityChange={setGranularity}
      />

      {isLoading ? (
        <LoadingSpinner message="Loading cost data..." />
      ) : data ? (
        <>
          {/* Summary Cards */}
          <div className="flex items-center justify-between">
            <div />
            <button
              onClick={() => void exportCosts(data.entries, { service, region, startDate, endDate }, accountData?.account_name ?? "Unknown")}
              className="flex items-center gap-2 rounded-lg border border-[#2e3348] bg-[#1a1d29] px-3 py-1.5 text-sm text-[#e4e6f0] transition-colors hover:border-indigo-500/50 hover:text-indigo-400"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export XLSX
            </button>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-[#2e3348] bg-[#1a1d29] p-4">
              <p className="text-xs text-[#8b8fa3]">Total Cost</p>
              <p className="mt-1 text-2xl font-bold text-indigo-400">
                {formatCurrency(data.total)}
              </p>
            </div>
            <div className="rounded-xl border border-[#2e3348] bg-[#1a1d29] p-4">
              <p className="text-xs text-[#8b8fa3]">Services</p>
              <p className="mt-1 text-2xl font-bold text-[#e4e6f0]">
                {new Set(data.entries.map((e) => e.service)).size}
              </p>
            </div>
            <div className="rounded-xl border border-[#2e3348] bg-[#1a1d29] p-4">
              <p className="text-xs text-[#8b8fa3]">Regions</p>
              <p className="mt-1 text-2xl font-bold text-[#e4e6f0]">
                {new Set(data.entries.map((e) => e.region)).size}
              </p>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-[#2e3348] bg-[#1a1d29] p-4">
              <h3 className="mb-4 text-sm font-semibold text-[#e4e6f0]">
                Cost Over Time
              </h3>
              <CostBarChart entries={data.entries} />
            </div>
            <div className="rounded-xl border border-[#2e3348] bg-[#1a1d29] p-4">
              <h3 className="mb-4 text-sm font-semibold text-[#e4e6f0]">
                Cost by Service
              </h3>
              <CostPieChart entries={data.entries} />
            </div>
          </div>

          {/* Top Costs Table */}
          <div className="rounded-xl border border-[#2e3348] bg-[#1a1d29] p-4">
            <h3 className="mb-4 text-sm font-semibold text-[#e4e6f0]">
              Top Costs by Service
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#2e3348] text-left text-xs text-[#8b8fa3]">
                    <th className="pb-2 pr-4">Service</th>
                    <th className="pb-2 pr-4">Region</th>
                    <th className="pb-2 text-right">Total Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const grouped = new Map<string, { region: string; total: number }>();
                    for (const e of data.entries) {
                      const key = `${e.service}|${e.region}`;
                      const prev = grouped.get(key) || { region: e.region, total: 0 };
                      prev.total += e.amount;
                      grouped.set(key, prev);
                    }
                    return [...grouped.entries()]
                      .sort((a, b) => b[1].total - a[1].total)
                      .slice(0, 15)
                      .map(([key, val]) => (
                        <tr key={key} className="border-b border-[#2e3348]/50">
                          <td className="py-2 pr-4 text-[#e4e6f0]">
                            {key.split("|")[0]}
                          </td>
                          <td className="py-2 pr-4 text-[#8b8fa3]">{val.region}</td>
                          <td className="py-2 text-right font-mono text-[#e4e6f0]">
                            {formatCurrency(val.total)}
                          </td>
                        </tr>
                      ));
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
