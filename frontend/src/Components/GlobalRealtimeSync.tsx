"use client";

import { useEffect, useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import toast from "react-hot-toast";
import {
  FOCUS_TIMER_STORAGE_KEY,
  FOCUS_TIMER_CHANGED_EVENT,
  type FocusTimerPersistV2,
} from "@/lib/focusTimerStorage";
import { notifyFocusTimerDone } from "@/lib/notifyFocusTimerDone";
import { getNotificationsWebSocketUrl } from "@/lib/notificationsWebSocket";

const NOTIFICATIONS_NEW_EVENT = "notifications-new";

export function GlobalRealtimeSync() {
  const { t } = useLanguage();
  const { isAuthenticated, isLoading } = useAuth();
  const tRef = useRef(t);
  tRef.current = t;
  const authRef = useRef(isAuthenticated);
  authRef.current = isAuthenticated;

  /* Expire focus timer from any route (dashboard card unmounts when you navigate away). */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const tick = () => {
      try {
        const raw = localStorage.getItem(FOCUS_TIMER_STORAGE_KEY);
        if (!raw) return;
        const v = JSON.parse(raw) as FocusTimerPersistV2;
        if (v.v !== 2 || v.phase !== "running") return;
        const end = v.endsAt;
        if (typeof end !== "number" || Number.isNaN(end)) return;
        if (Date.now() < end) return;

        const donePayload: FocusTimerPersistV2 = {
          ...v,
          phase: "done",
          remainingSec: 0,
          endsAt: null,
        };
        localStorage.setItem(FOCUS_TIMER_STORAGE_KEY, JSON.stringify(donePayload));
        window.dispatchEvent(new CustomEvent(FOCUS_TIMER_CHANGED_EVENT));
        notifyFocusTimerDone(end, tRef.current("dashboard.focusTimerDoneTitle"), tRef.current("dashboard.focusTimerDoneBody"));
      } catch {
        /* ignore */
      }
    };
    tick();
    const id = window.setInterval(tick, 400);
    return () => window.clearInterval(id);
  }, []);

  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || isLoading) return;
    if (!isAuthenticated) {
      try {
        wsRef.current?.close();
      } catch {
        /* ignore */
      }
      wsRef.current = null;
      return;
    }

    let cancelled = false;
    let reconnectTimer: number | null = null;

    const clearReconnect = () => {
      if (reconnectTimer != null) {
        window.clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    };

    const connect = () => {
      if (cancelled || !authRef.current) return;
      if (typeof WebSocket === "undefined") return;
      let token: string | null = null;
      try {
        token = localStorage.getItem("token");
      } catch {
        return;
      }
      if (!token) return;
      const url = getNotificationsWebSocketUrl(token);
      if (!url) return;

      let ws: WebSocket;
      try {
        ws = new WebSocket(url);
      } catch {
        reconnectTimer = window.setTimeout(connect, 5000);
        return;
      }
      wsRef.current = ws;

      ws.onmessage = (ev) => {
        try {
          const data = JSON.parse(String(ev.data)) as { type?: string; title?: string; body?: string };
          if (data.type !== "notification") return;
          const title = data.title?.trim() || tRef.current("notifications.pushToastFallbackTitle");
          const body = data.body?.trim() || "";
          try {
            toast(body ? `${title}\n${body}` : title, { duration: 6000 });
          } catch {
            /* ignore */
          }
          window.dispatchEvent(new CustomEvent(NOTIFICATIONS_NEW_EVENT));
        } catch {
          /* ignore */
        }
      };

      ws.onclose = () => {
        if (wsRef.current === ws) wsRef.current = null;
        if (!cancelled && authRef.current) {
          clearReconnect();
          reconnectTimer = window.setTimeout(connect, 5000);
        }
      };

      ws.onerror = () => {
        try {
          ws.close();
        } catch {
          /* ignore */
        }
      };
    };

    connect();

    return () => {
      cancelled = true;
      clearReconnect();
      try {
        wsRef.current?.close();
      } catch {
        /* ignore */
      }
      wsRef.current = null;
    };
  }, [isAuthenticated, isLoading]);

  return null;
}
