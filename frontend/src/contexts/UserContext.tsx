"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import api from "@/lib/axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3020";

export interface UserProfile {
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  avatarUrl: string | null;
  avatarSrc: string | null; // full URL for Avatar component
}

const UserContext = createContext<{
  profile: UserProfile | null;
  isLoading: boolean;
  refreshProfile: () => void;
} | null>(null);

function getAvatarSrc(url: string | null): string | null {
  if (!url) return null;
  return url.startsWith("http") ? url : `${API_URL}${url}`;
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchProfile = useCallback(() => {
    if (!isAuthenticated) {
      setProfile(null);
      return;
    }
    setIsLoading(true);
    api
      .get("/profile")
      .then((r) => {
        const d = r.data;
        const fn = d.firstName?.trim() ?? "";
        const ln = d.lastName?.trim() ?? "";
        const displayName = (fn || ln ? `${fn} ${ln}`.trim() : null) || d.displayName || d.email || null;
        const avatarUrl = d.avatarUrl ?? null;
        setProfile({
          displayName,
          firstName: fn || null,
          lastName: ln || null,
          email: d.email ?? null,
          avatarUrl,
          avatarSrc: getAvatarSrc(avatarUrl),
        });
      })
      .catch(() => setProfile(null))
      .finally(() => setIsLoading(false));
  }, [isAuthenticated]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    const handler = () => fetchProfile();
    window.addEventListener("profile-avatar-updated", handler);
    window.addEventListener("profile-updated", handler);
    return () => {
      window.removeEventListener("profile-avatar-updated", handler);
      window.removeEventListener("profile-updated", handler);
    };
  }, [fetchProfile]);

  return (
    <UserContext.Provider value={{ profile, isLoading, refreshProfile: fetchProfile }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  return ctx;
}
