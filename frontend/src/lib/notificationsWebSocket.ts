/**
 * Browser WebSocket URL for real-time in-app notifications.
 * Backend path: /ws/notifications?token=JWT
 * Reverse proxy must forward Upgrade + Connection for this path.
 */
export function getNotificationsWebSocketUrl(token: string): string | null {
  if (typeof window === "undefined" || !token) return null;
  const raw = process.env.NEXT_PUBLIC_API_URL;
  const baseStr =
    raw && String(raw).trim() !== "" && String(raw).trim() !== "undefined"
      ? String(raw).trim()
      : "http://localhost:3020";
  let httpBase: URL;
  try {
    httpBase = new URL(baseStr);
    if (!httpBase.hostname) return null;
  } catch {
    return null;
  }
  const wsUrl = new URL("/ws/notifications", httpBase);
  wsUrl.protocol = httpBase.protocol === "https:" ? "wss:" : "ws:";
  wsUrl.searchParams.set("token", token);
  return wsUrl.toString();
}
