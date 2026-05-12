"use client";

import { useAuth } from "./useAuth";
import type { UserStatus } from "@/types";

/**
 * Returns the current user's role from auth state.
 */
export function useRole(): UserStatus | null {
  const { role } = useAuth();
  return role;
}
