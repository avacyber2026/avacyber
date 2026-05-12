"use client";

import dynamic from "next/dynamic";
import { AuthCookieSync } from "@/Components/AuthCookieSync";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { SidebarLayoutProvider } from "@/contexts/SidebarLayoutContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { UserProvider } from "@/contexts/UserContext";

/** Только в браузере: WebSocket + localStorage таймера — исключаем SSR/гидрацию. */
const GlobalRealtimeSync = dynamic(
  () => import("@/Components/GlobalRealtimeSync").then((m) => ({ default: m.GlobalRealtimeSync })),
  { ssr: false, loading: () => null }
);

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider initialColorMode="light">
      <LanguageProvider>
        <UserProvider>
          <SidebarLayoutProvider>
            <AuthCookieSync />
            <GlobalRealtimeSync />
            {children}
          </SidebarLayoutProvider>
        </UserProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
