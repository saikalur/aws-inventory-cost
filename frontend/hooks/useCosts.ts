import useSWR from "swr";
import { fetchApi } from "@/lib/api";
import type { CostResponse } from "@/lib/types";

interface CostParams {
  profile?: string;
  startDate?: string;
  endDate?: string;
  service?: string;
  region?: string;
  granularity?: string;
}

export function useCosts(params: CostParams = {}) {
  const key = JSON.stringify(["costs", params]);
  return useSWR<CostResponse>(key, () =>
    fetchApi<CostResponse>("/api/costs", {
      profile: params.profile || "",
      start_date: params.startDate || "",
      end_date: params.endDate || "",
      service: params.service || "",
      region: params.region || "",
      granularity: params.granularity || "DAILY",
    })
  );
}
