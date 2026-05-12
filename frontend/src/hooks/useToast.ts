"use client";

import { useCallback } from "react";
import hotToast from "react-hot-toast";

export interface ToastOptions {
  title?: string;
  description?: string;
  status?: "success" | "error" | "info" | "warning";
  duration?: number;
  isClosable?: boolean;
}

function pushToast(options: ToastOptions | string) {
  const opts = typeof options === "string" ? { title: options } : options;
  const title = opts.title;
  const desc = opts.description;
  const message =
    title && desc ? `${title}\n${desc}` : (title ?? desc ?? "").trim();
  if (!message) return;

  const duration = opts.duration ?? 5000;
  const status = opts.status ?? "info";

  if (status === "success") {
    hotToast.success(message, { duration });
  } else if (status === "error") {
    hotToast.error(message, { duration });
  } else if (status === "warning") {
    hotToast(message, { duration, icon: "⚠️" });
  } else {
    hotToast(message, { duration });
  }
}

export function useToast() {
  const toast = useCallback((options: ToastOptions | string) => {
    pushToast(options);
  }, []);

  return { toast };
}
