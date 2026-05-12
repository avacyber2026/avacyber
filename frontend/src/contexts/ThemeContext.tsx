"use client";

import { createContext, useContext, useEffect, useState } from "react";

type ColorMode = "light" | "dark";

interface ThemeContextValue {
  colorMode: ColorMode;
  toggleColorMode: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({
  children,
  initialColorMode = "light",
}: {
  children: React.ReactNode;
  initialColorMode?: ColorMode;
}) {
  const [colorMode, setColorMode] = useState<ColorMode>(initialColorMode);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("chakra-ui-color-mode") as ColorMode | null;
    if (stored === "dark" || stored === "light") {
      setColorMode(stored);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    if (colorMode === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("chakra-ui-color-mode", colorMode);
  }, [colorMode, mounted]);

  const toggleColorMode = () => {
    setColorMode((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <ThemeContext.Provider value={{ colorMode, toggleColorMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useColorMode(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useColorMode must be used within ThemeProvider");
  return ctx;
}
