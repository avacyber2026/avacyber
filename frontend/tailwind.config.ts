import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/Components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/contexts/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/ui/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/styles/**/*.css",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "#1F6A5C",
          primaryDark: "#103E36",
          primaryLight: "#50BFA0",
          mint: "#3FFFA3",
          sidebar: "#0B1F1A",
        },
        app: {
          mainBg: { DEFAULT: "#F4F3F4", dark: "#1C1E1C" },
          cardBg: { DEFAULT: "white", dark: "#1F2220" },
          cardStrong: { dark: "#272B28" },
          insetBg: { dark: "#1A1D1B" },
          border: { DEFAULT: "#e5e7eb", dark: "rgba(255,255,255,0.06)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
