"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { setOnCredentialsExpired } from "@/lib/api";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface ProfileContextValue {
  profile: string;
  setProfile: (p: string) => void;
  profiles: string[];
  showCredentialPrompt: boolean;
  requestCredentials: () => void;
  onCredentialsSet: () => void;
  dismissCredentialPrompt: () => void;
}

const ProfileContext = createContext<ProfileContextValue>({
  profile: "",
  setProfile: () => {},
  profiles: [],
  showCredentialPrompt: false,
  requestCredentials: () => {},
  onCredentialsSet: () => {},
  dismissCredentialPrompt: () => {},
});

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState("");
  const [showCredentialPrompt, setShowCredentialPrompt] = useState(false);
  const { mutate } = useSWRConfig();
  const { data } = useSWR<{ profiles: string[] }>(
    "http://localhost:8000/api/profiles",
    fetcher
  );
  const profiles = data?.profiles ?? [];

  const requestCredentials = useCallback(() => {
    setShowCredentialPrompt(true);
  }, []);

  // Register global callback so fetchApi can trigger the modal
  useEffect(() => {
    setOnCredentialsExpired(requestCredentials);
    return () => setOnCredentialsExpired(null);
  }, [requestCredentials]);

  const onCredentialsSet = useCallback(() => {
    setShowCredentialPrompt(false);
    // Revalidate all SWR caches so data refreshes with new credentials
    void mutate(() => true, undefined, { revalidate: true });
  }, [mutate]);

  const dismissCredentialPrompt = useCallback(() => {
    setShowCredentialPrompt(false);
  }, []);

  return (
    <ProfileContext.Provider value={{
      profile,
      setProfile,
      profiles,
      showCredentialPrompt,
      requestCredentials,
      onCredentialsSet,
      dismissCredentialPrompt,
    }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  return useContext(ProfileContext);
}
