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
        },
        app: {
          mainBg: { DEFAULT: "#F4F3F4", dark: "#1C1E1C" },
          /** Поверхность карточек / сайдбара в тёмной теме (над #1C1E1C) */
          cardBg: { DEFAULT: "white", dark: "#232522" },
          /** Вдавленные треки, вложенные блоки */
          insetBg: { dark: "#2c2f2c" },
          border: { DEFAULT: "#e5e7eb", dark: "#2c2f2c" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
