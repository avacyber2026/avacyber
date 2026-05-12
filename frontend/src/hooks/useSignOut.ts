"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { clearAppAuthCookie } from "@/lib/authCookies";

export function useSignOut() {
  const router = useRouter();
  return useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("status");
      localStorage.removeItem("user");
      clearAppAuthCookie();
    }
    router.push("/");
  }, [router]);
}
