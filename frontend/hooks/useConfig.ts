import useSWR from "swr";
import { fetchApi } from "@/lib/api";
import type { ConfigResponse } from "@/lib/types";

export function useConfig(profile?: string) {
  return useSWR<ConfigResponse>(["config", profile], () =>
    fetchApi<ConfigResponse>("/api/config", profile ? { profile } : undefined)
  );
}
