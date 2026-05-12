import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Прод-сборка без .env (часто не копируют из-за .gitignore) — иначе в бандл попадает localhost и сайт на домене падает. */
const defaultPublicApiUrl =
  process.env.NODE_ENV === "production"
    ? "https://api.ava-cyber.com"
    : "http://localhost:3020";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname),
  env: {
    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL || defaultPublicApiUrl,
  },
  // Core Web Vitals: optimize loading and reduce layout shift
  experimental: {
    optimizePackageImports: ["react-icons"],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error", "warn"] } : false,
  },
};

export default nextConfig;
