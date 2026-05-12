import axios from "axios";
import { clearAdminAuthCookie } from "@/lib/authCookies";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3020";

const adminApi = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

adminApi.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("adminToken");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  if (config.data instanceof FormData && config.headers) {
    if (typeof config.headers.delete === "function") {
      config.headers.delete("Content-Type");
    } else {
      delete (config.headers as Record<string, unknown>)["Content-Type"];
    }
  }
  return config;
});

adminApi.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("adminToken");
      localStorage.removeItem("adminUser");
      clearAdminAuthCookie();
      window.location.href = "/admin/auth";
    }
    return Promise.reject(err);
  }
);

export default adminApi;
