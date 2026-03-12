"use client";

import AccountBadge from "./AccountBadge";
import { useProfile } from "@/lib/ProfileContext";

export default function Header() {
  const { profile, setProfile, profiles } = useProfile();

  return (
    <header className="border-b border-[#2e3348] bg-[#1a1d29] px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20">
            <svg
              className="h-5 w-5 text-indigo-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"
              />
            </svg>
          </div>
          <h1 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            AWS Inventory &amp; Cost Reporter
            <AccountBadge />
          </h1>
        </div>

        {profiles.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-xs text-[#8b93b0]">Profile</label>
            <select
              value={profile}
              onChange={(e) => setProfile(e.target.value)}
              className="rounded-md border border-[#2e3348] bg-[#0f1117] px-3 py-1.5 text-sm text-[#e4e6f0] focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">default</option>
              {profiles.filter((p) => p !== "default").map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </header>
  );
}
