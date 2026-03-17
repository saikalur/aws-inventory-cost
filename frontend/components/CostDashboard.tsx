"use client";

import { useState } from "react";
import { useCosts } from "@/hooks/useCosts";
import { useConfig } from "@/hooks/useConfig";
import { useInventory } from "@/hooks/useInventory";
import { useProfile } from "@/lib/ProfileContext";
import { useAccount } from "@/hooks/useAccount";


import ServiceFilter from "./ServiceFilter";
import MultiSelect from "./MultiSelect";
import CostBarChart from "./CostBarChart";
import CostPieChart from "./CostPieChart";
import LoadingSpinner from "./LoadingSpinner";
import { formatCurrency } from "@/lib/utils";
import { exportCosts } from "@/lib/exportXlsx";
import { SERVICE_COST_KEYWORDS, ADJUSTMENT_CATEGORIES } from "@/lib/constants";
import type { CostEntry } from "@/lib/types";

function classifyEntry(entry: CostEntry) {
  const name = entry.service.toLowerCase();
  for (const cat of ADJUSTMENT_CATEGORIES) {
    if (cat.keywords.some((kw) => name.includes(kw))) return cat.key;
  }
  return "service";
}

export default function CostDashboard({ linkedAccount }: { linkedAccount: string }) {
  const today = new Date().toISOString().split("T")[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000)
    .toISOString()
    .split("T")[0];

  const [startDate, setStartDate] = useState(thirtyDaysAgo);
  const [endDate, setEndDate] = useState(today);
  const [service, setService] = useState("");
  const [region, setRegion] = useState("");
  const [granularity, setGranularity] = useState("DAILY");
  const [metric, setMetric] = useState("NetAmortizedCost");
  const [selectedVpcs, setSelectedVpcs] = useState<Set<string>>(new Set());

  const { profile } = useProfile();
  const { data: accountData } = useAccount();
  const { data: config } = useConfig(profile);
  const { data: inventory, isLoading: inventoryLoading } = useInventory(profile);
  const { data, isLoading, error } = useCosts({
    profile,
    startDate,
    endDate,
    service,
    region,
    granularity,
    metric,
    linkedAccount,
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

  // Build VPC options from inventory
  const vpcOptions = (inventory?.nodes ?? [])
    .filter((n) => n.service === "vpc" && n.resource_type === "VPC")
    .map((n) => ({ value: n.id, label: n.label !== n.id ? `${n.label} (${n.id})` : n.id }))
    .sort((a, b) => a.label.localeCompare(b.label));

  // VPC filter
  const vpcFilteredEntries = (() => {
    const entries = data?.entries ?? [];
    if (selectedVpcs.size === 0) return entries;
    const inventoryNodes = inventory?.nodes ?? [];
    const servicesInVpcs = new Set(
      inventoryNodes
        .filter((n) => selectedVpcs.has(n.id) || selectedVpcs.has(String(n.metadata.vpc_id ?? "")))
        .map((n) => n.service)
    );
    return entries.filter((e) => {
      const name = e.service.toLowerCase();
      return [...servicesInVpcs].some((svc) =>
        (SERVICE_COST_KEYWORDS[svc] ?? [svc]).some((kw) => name.includes(kw.toLowerCase()))
      );
    });
  })();

  // Split into regular service entries vs adjustments
  const serviceEntries = vpcFilteredEntries.filter((e) => classifyEntry(e) === "service");
  const adjustmentEntries = vpcFilteredEntries.filter((e) => classifyEntry(e) !== "service");

  const serviceTotal = serviceEntries.reduce((s, e) => s + e.amount, 0);
  const adjustmentNet = adjustmentEntries.reduce((s, e) => s + e.amount, 0);
  const netTotal = serviceTotal + adjustmentNet;

  // Aggregate adjustments by category
  const adjustmentByCategory = ADJUSTMENT_CATEGORIES.map((cat) => {
    const entries = adjustmentEntries.filter((e) => classifyEntry(e) === cat.key);
    const total = entries.reduce((s, e) => s + e.amount, 0);
    const rows = new Map<string, number>();
    for (const e of entries) {
      rows.set(e.service, (rows.get(e.service) ?? 0) + e.amount);
    }
    return { ...cat, total, rows };
  }).filter((cat) => cat.rows.size > 0);

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <ServiceFilter
          startDate={startDate}
          endDate={endDate}
          service={service}
          region={region}
          granularity={granularity}
          metric={metric}
          availableServices={entryServices}
          availableRegions={config?.regions || entryRegions}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          onServiceChange={setService}
          onRegionChange={setRegion}
          onGranularityChange={setGranularity}
          onMetricChange={setMetric}
        />
        <div className="flex items-end rounded-xl border border-[#2e3348] bg-[#1a1d29] px-4 py-4">
          {inventoryLoading ? (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#8b8fa3]">VPC</label>
              <div className="flex items-center gap-2 rounded-lg border border-[#2e3348] bg-[#252836] px-3 py-2 text-xs text-[#8b8fa3]">
                <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                </svg>
                Waiting for resource graph…
              </div>
            </div>
          ) : (
            <MultiSelect
              label="VPC"
              options={vpcOptions}
              selected={selectedVpcs}
              onChange={setSelectedVpcs}
              placeholder="All VPCs"
            />
          )}
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner message="Loading cost data..." />
      ) : data ? (
        <>
          {/* Export */}
          <div className="flex justify-end">
            <button
              onClick={() => void exportCosts(vpcFilteredEntries, { service, region, startDate, endDate }, accountData?.account_name ?? "Unknown")}
              className="flex items-center gap-2 rounded-lg border border-[#2e3348] bg-[#1a1d29] px-3 py-1.5 text-sm text-[#e4e6f0] transition-colors hover:border-indigo-500/50 hover:text-indigo-400"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export XLSX
            </button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-[#2e3348] bg-[#1a1d29] p-4">
              <p className="text-xs text-[#8b8fa3]">Service Costs</p>
              <p className="mt-1 text-2xl font-bold text-indigo-400">
                {formatCurrency(serviceTotal)}
              </p>
              <p className="mt-0.5 text-xs text-[#8b8fa3]">
                {new Set(serviceEntries.map((e) => e.service)).size} services
                · {new Set(serviceEntries.map((e) => e.region)).size} regions
              </p>
            </div>
            <div className="rounded-xl border border-[#2e3348] bg-[#1a1d29] p-4">
              <p className="text-xs text-[#8b8fa3]">Adjustments</p>
              <p className={`mt-1 text-2xl font-bold ${adjustmentNet <= 0 ? "text-emerald-400" : "text-orange-400"}`}>
                {adjustmentNet > 0 ? "+" : ""}{formatCurrency(adjustmentNet)}
              </p>
              <p className="mt-0.5 text-xs text-[#8b8fa3]">
                Tax · Marketplace · Discounts · Credits
              </p>
            </div>
            <div className="rounded-xl border border-[#2e3348] bg-[#1a1d29] p-4">
              <p className="text-xs text-[#8b8fa3]">Net Total</p>
              <p className="mt-1 text-2xl font-bold text-[#e4e6f0]">
                {formatCurrency(netTotal)}
              </p>
              <p className="mt-0.5 text-xs text-[#8b8fa3]">After all adjustments</p>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-[#2e3348] bg-[#1a1d29] p-4">
              <h3 className="mb-4 text-sm font-semibold text-[#e4e6f0]">Cost Over Time</h3>
              <CostBarChart entries={serviceEntries} />
            </div>
            <div className="rounded-xl border border-[#2e3348] bg-[#1a1d29] p-4">
              <h3 className="mb-4 text-sm font-semibold text-[#e4e6f0]">Cost by Service</h3>
              <CostPieChart entries={serviceEntries} />
            </div>
          </div>

          {/* Top Costs Table */}
          <div className="rounded-xl border border-[#2e3348] bg-[#1a1d29] p-4">
            <h3 className="mb-4 text-sm font-semibold text-[#e4e6f0]">Top Costs by Service</h3>
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
                    for (const e of serviceEntries) {
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
                          <td className="py-2 pr-4 text-[#e4e6f0]">{key.split("|")[0]}</td>
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

          {/* Adjustments Section */}
          {adjustmentByCategory.length > 0 && (
            <div className="rounded-xl border border-[#2e3348] bg-[#1a1d29] p-4">
              <h3 className="mb-4 text-sm font-semibold text-[#e4e6f0]">Adjustments</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {adjustmentByCategory.map((cat) => (
                  <div key={cat.key} className="rounded-lg border border-[#2e3348] bg-[#252836] p-3">
                    {/* Category header */}
                    <div className="mb-2 flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: cat.color }} />
                      <p className="text-xs font-semibold" style={{ color: cat.color }}>{cat.label}</p>
                    </div>
                    <p className={`mb-3 text-lg font-bold ${cat.total <= 0 ? "text-emerald-400" : "text-[#e4e6f0]"}`}>
                      {cat.total > 0 ? "+" : ""}{formatCurrency(cat.total)}
                    </p>
                    {/* Line items */}
                    <div className="space-y-1 border-t border-[#2e3348] pt-2">
                      {[...cat.rows.entries()]
                        .sort((a, b) => b[1] - a[1])
                        .map(([name, amount]) => (
                          <div key={name} className="flex justify-between gap-2 text-xs">
                            <span className="truncate text-[#8b8fa3]" title={name}>{name}</span>
                            <span className={`font-mono ${amount <= 0 ? "text-emerald-400" : "text-[#e4e6f0]"}`}>
                              {amount > 0 ? "+" : ""}{formatCurrency(amount)}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
