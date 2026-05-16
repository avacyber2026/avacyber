"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "app-sidebar-collapsed";

/** Total horizontal space the rail occupies, px */
export const SIDEBAR_RAIL_EXPANDED = 240;
export const SIDEBAR_RAIL_COLLAPSED = 60;

type SidebarLayoutValue = {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  toggleCollapsed: () => void;
  railWidth: number;
};

const SidebarLayoutContext = createContext<SidebarLayoutValue | null>(null);

function applyCssVar(px: number) {
  if (typeof document === "undefined") return;
  document.documentElement.style.setProperty("--app-sidebar-width", `${px}px`);
}

export function SidebarLayoutProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsedState] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      if (s === "1") setCollapsedState(true);
    } catch {
      /* ignore */
    }
    setMounted(true);
  }, []);

  const railWidth = collapsed ? SIDEBAR_RAIL_COLLAPSED : SIDEBAR_RAIL_EXPANDED;

  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
    } catch {
      /* ignore */
    }
    applyCssVar(railWidth);
  }, [collapsed, mounted, railWidth]);

  const setCollapsed = useCallback((v: boolean) => setCollapsedState(v), []);
  const toggleCollapsed = useCallback(() => setCollapsedState((c) => !c), []);

  const value = useMemo(
    () => ({ collapsed, setCollapsed, toggleCollapsed, railWidth }),
    [collapsed, setCollapsed, toggleCollapsed, railWidth]
  );

  return <SidebarLayoutContext.Provider value={value}>{children}</SidebarLayoutContext.Provider>;
}

export function useSidebarLayout(): SidebarLayoutValue {
  const ctx = useContext(SidebarLayoutContext);
  if (!ctx) throw new Error("useSidebarLayout must be used within SidebarLayoutProvider");
  return ctx;
}

export function useSidebarLayoutOptional(): SidebarLayoutValue | null {
  return useContext(SidebarLayoutContext);
}
