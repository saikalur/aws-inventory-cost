import useSWR from "swr";
import { fetchApi } from "@/lib/api";
import type { InventoryResponse } from "@/lib/types";

export function useInventory(profile?: string, linkedAccount?: string) {
  const key = JSON.stringify(["inventory", profile, linkedAccount]);
  return useSWR<InventoryResponse>(
    key,
    () => {
      const params: Record<string, string> = {};
      if (profile) params.profile = profile;
      if (linkedAccount) params.linked_account = linkedAccount;
      return fetchApi<InventoryResponse>("/api/inventory", params);
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 600_000, // 10 min — avoid duplicate requests
    },
  );
}
