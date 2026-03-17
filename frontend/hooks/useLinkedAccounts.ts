import useSWR from "swr";
import { fetchApi } from "@/lib/api";

interface LinkedAccount {
  id: string;
  name: string;
}

interface LinkedAccountsResponse {
  accounts: LinkedAccount[];
}

export function useLinkedAccounts(profile?: string) {
  const key = JSON.stringify(["linked-accounts", profile]);
  return useSWR<LinkedAccountsResponse>(key, () =>
    fetchApi<LinkedAccountsResponse>("/api/linked-accounts", {
      profile: profile || "",
    })
  );
}
