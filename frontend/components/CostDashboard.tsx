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
import { SERVICE_COST_KEYWORDS } from "@/lib/constants";

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

  // For selected VPCs, find which inventory services have nodes in those VPCs
  const vpcFilteredEntries = (() => {
    const entries = data?.entries ?? [];
    if (selectedVpcs.size === 0) return entries;

    const inventoryNodes = inventory?.nodes ?? [];
    const servicesInVpcs = new Set(
      inventoryNodes
        .filter(
          (n) =>
            selectedVpcs.has(n.id) ||
            selectedVpcs.has(String(n.metadata.vpc_id ?? ""))
        )
        .map((n) => n.service)
    );

    return entries.filter((e) => {
      const name = e.service.toLowerCase();
      return [...servicesInVpcs].some((svc) =>
        (SERVICE_COST_KEYWORDS[svc] ?? [svc]).some((kw) =>
          name.includes(kw.toLowerCase())
        )
      );
    });
  })();

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-6">
      <div className="flex flex-wrap gap-3">
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
          {/* Summary Cards */}
          <div className="flex items-center justify-between">
            <div />
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-[#2e3348] bg-[#1a1d29] p-4">
              <p className="text-xs text-[#8b8fa3]">Total Cost</p>
              <p className="mt-1 text-2xl font-bold text-indigo-400">
                {formatCurrency(vpcFilteredEntries.reduce((s, e) => s + e.amount, 0))}
              </p>
            </div>
            <div className="rounded-xl border border-[#2e3348] bg-[#1a1d29] p-4">
              <p className="text-xs text-[#8b8fa3]">Services</p>
              <p className="mt-1 text-2xl font-bold text-[#e4e6f0]">
                {new Set(vpcFilteredEntries.map((e) => e.service)).size}
              </p>
            </div>
            <div className="rounded-xl border border-[#2e3348] bg-[#1a1d29] p-4">
              <p className="text-xs text-[#8b8fa3]">Regions</p>
              <p className="mt-1 text-2xl font-bold text-[#e4e6f0]">
                {new Set(vpcFilteredEntries.map((e) => e.region)).size}
              </p>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-[#2e3348] bg-[#1a1d29] p-4">
              <h3 className="mb-4 text-sm font-semibold text-[#e4e6f0]">
                Cost Over Time
              </h3>
              <CostBarChart entries={vpcFilteredEntries} />
            </div>
            <div className="rounded-xl border border-[#2e3348] bg-[#1a1d29] p-4">
              <h3 className="mb-4 text-sm font-semibold text-[#e4e6f0]">
                Cost by Service
              </h3>
              <CostPieChart entries={vpcFilteredEntries} />
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
                    for (const e of vpcFilteredEntries) {
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
