"use client";

import { useState } from "react";
import TabNav from "@/components/TabNav";
import Graph from "@/components/Graph";
import CostDashboard from "@/components/CostDashboard";
import CredentialModal from "@/components/CredentialModal";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useInventory } from "@/hooks/useInventory";
import { useLinkedAccounts } from "@/hooks/useLinkedAccounts";
import { useProfile } from "@/lib/ProfileContext";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"graph" | "costs">("graph");
  const [linkedAccount, setLinkedAccount] = useState("");
  const { profile, showCredentialPrompt, onCredentialsSet, dismissCredentialPrompt } = useProfile();
  const { data: linkedAccountsData } = useLinkedAccounts(profile);
  const linkedAccounts = linkedAccountsData?.accounts ?? [];
  const { data: inventory, isLoading, error } = useInventory(profile, linkedAccount);

  return (
    <div className="flex h-full flex-col">
      {showCredentialPrompt && (
        <CredentialModal
          profile={profile}
          onSuccess={onCredentialsSet}
          onCancel={dismissCredentialPrompt}
        />
      )}

      <div className="flex items-center justify-between border-b border-[#2e3348] bg-[#1a1d29]/50 px-6 py-3">
        <TabNav activeTab={activeTab} onTabChange={setActiveTab} />
        {linkedAccounts.length > 1 && (
          <div className="flex items-center gap-2">
            <label className="text-xs text-[#8b8fa3]">Account</label>
            <select
              value={linkedAccount}
              onChange={(e) => setLinkedAccount(e.target.value)}
              className="h-[34px] rounded-md border border-[#2e3348] bg-[#0f1117] px-3 py-1.5 text-sm text-[#e4e6f0] focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">All Accounts</option>
              {linkedAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name !== a.id ? `${a.name} (${a.id})` : a.id}
                </option>
              ))}
            </select>
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
            <div className="flex h-full flex-col">
              {inventory.warning && (
                <div className="mx-6 mt-3 rounded-lg border border-orange-500/30 bg-orange-500/10 px-4 py-2 text-xs text-orange-400">
                  {inventory.warning}
                </div>
              )}
              <div className="flex-1 overflow-hidden">
                <Graph nodes={inventory.nodes} links={inventory.links} />
              </div>
            </div>
          ) : null
        ) : (
          <CostDashboard linkedAccount={linkedAccount} />
        )}
      </div>
    </div>
  );
}
