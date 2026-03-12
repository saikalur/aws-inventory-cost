import useSWR from "swr";
import { fetchApi } from "@/lib/api";
import type { InventoryResponse } from "@/lib/types";

export function useInventory(profile?: string) {
  return useSWR<InventoryResponse>(["inventory", profile], () =>
    fetchApi<InventoryResponse>("/api/inventory", profile ? { profile } : undefined)
  );
}
