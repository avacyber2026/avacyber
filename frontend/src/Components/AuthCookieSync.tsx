"use client";

import { useEffect } from "react";
import { setAppAuthCookie, setAdminAuthCookie } from "@/lib/authCookies";

/**
 * Syncs auth state from localStorage to cookies so middleware can protect routes.
 * Runs once on mount so existing sessions (token in localStorage) get a cookie.
 */
export function AuthCookieSync() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("token");
    const adminToken = localStorage.getItem("adminToken");
    if (token) setAppAuthCookie(token);
    if (adminToken) setAdminAuthCookie(adminToken);
  }, []);
  return null;
}
