"use client";

import { useState } from "react";
import TabNav from "@/components/TabNav";
import Graph from "@/components/Graph";
import CostDashboard from "@/components/CostDashboard";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useInventory } from "@/hooks/useInventory";
import { useProfile } from "@/lib/ProfileContext";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"graph" | "costs">("graph");
  const { profile } = useProfile();
  const { data: inventory, isLoading, error } = useInventory(profile);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-[#2e3348] bg-[#1a1d29]/50 px-6 py-3">
        <TabNav activeTab={activeTab} onTabChange={setActiveTab} />
        {inventory && (
          <div className="flex gap-4 text-xs text-[#8b8fa3]">
            <span>{inventory.nodes.length} resources</span>
            <span>{inventory.links.length} connections</span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-hidden">
        {activeTab === "graph" ? (
          isLoading ? (
            <LoadingSpinner message="Collecting AWS inventory..." />
          ) : error ? (
            <div className="flex h-full items-center justify-center">
              <div className="max-w-md rounded-xl border border-red-500/30 bg-red-500/10 px-6 py-4 text-center text-sm text-red-400">
                <p className="font-semibold">Failed to load inventory</p>
                <p className="mt-1 text-xs opacity-80">
                  Check that the backend is running at{" "}
                  {process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"} and
                  your AWS credentials are configured.
                </p>
              </div>
            </div>
          ) : inventory ? (
            <Graph nodes={inventory.nodes} links={inventory.links} />
          ) : null
        ) : (
          <CostDashboard />
        )}
      </div>
    </div>
  );
}
