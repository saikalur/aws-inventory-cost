import useSWR from "swr";
import { useProfile } from "@/lib/ProfileContext";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useAccount() {
  const { profile } = useProfile();
  const url = `http://localhost:8000/api/account${profile ? `?profile=${encodeURIComponent(profile)}` : ""}`;
  return useSWR<{ account_id: string; account_name: string }>(url, fetcher);
}
