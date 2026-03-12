"use client";

import { createContext, useContext, useState } from "react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface ProfileContextValue {
  profile: string;
  setProfile: (p: string) => void;
  profiles: string[];
}

const ProfileContext = createContext<ProfileContextValue>({
  profile: "",
  setProfile: () => {},
  profiles: [],
});

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState("");
  const { data } = useSWR<{ profiles: string[] }>(
    "http://localhost:8000/api/profiles",
    fetcher
  );
  const profiles = data?.profiles ?? [];

  return (
    <ProfileContext.Provider value={{ profile, setProfile, profiles }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  return useContext(ProfileContext);
}
