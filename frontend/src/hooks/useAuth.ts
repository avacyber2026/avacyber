"use client";

import { useState, useEffect } from "react";
import type { UserStatus } from "@/types";

export interface AuthUser {
  email: string;
  role: string;
}

export interface UseAuthResult {
  token: string | null;
  user: AuthUser | null;
  role: UserStatus | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export function useAuth(): UseAuthResult {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [role, setRole] = useState<UserStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const t = localStorage.getItem("token");
    const u = localStorage.getItem("user");
    const r = localStorage.getItem("status") as UserStatus | null;
    setToken(t);
    setRole(r);
    if (u) {
      try {
        const parsed = JSON.parse(u) as { email?: string; role?: string };
        setUser(parsed ? { email: parsed.email ?? "", role: parsed.role ?? "" } : null);
      } catch {
        setUser(null);
      }
    } else {
      setUser(null);
    }
    setIsLoading(false);
  }, []);

  return {
    token,
    user,
    role,
    isAuthenticated: !!token,
    isLoading,
  };
}
