"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { translations, defaultLocale, type Locale } from "@/lib/i18n/translations";

const STORAGE_KEY = "app-locale";

type LanguageContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(STORAGE_KEY);
    const allowed: Locale[] = ["en", "cs", "fr", "es", "de"];
    if (stored && allowed.includes(stored as Locale)) setLocaleState(stored as Locale);
    else if (stored === "ru") {
      setLocaleState("en");
      localStorage.setItem(STORAGE_KEY, "en");
    }
    setMounted(true);
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, newLocale);
      document.documentElement.lang = newLocale;
    }
  }, []);

  useEffect(() => {
    if (mounted) document.documentElement.lang = locale;
  }, [mounted, locale]);

  const t = useCallback(
    (key: string): string => {
      const dict = translations[locale] ?? translations.en;
      return dict[key] ?? translations.en[key] ?? key;
    },
    [locale]
  );

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
