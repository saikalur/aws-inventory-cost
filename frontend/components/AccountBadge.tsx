"use client";

import { useAccount } from "@/hooks/useAccount";

export default function AccountBadge() {
  const { data } = useAccount();
  if (!data) return null;
  return (
    <span className="text-lg font-semibold tracking-tight text-[#8b93b0]">
      — {data.account_name}
    </span>
  );
}
