/**
 * Auth cookies for Next.js middleware (edge).
 * Synced from localStorage on login so middleware can protect routes.
 */

const COOKIE_APP = "appToken";
const COOKIE_ADMIN = "adminToken";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export function setAppAuthCookie(token: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE_APP}=${encodeURIComponent(token)}; path=/; max-age=${MAX_AGE}; SameSite=Lax`;
}

export function clearAppAuthCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE_APP}=; path=/; max-age=0`;
}

export function setAdminAuthCookie(token: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE_ADMIN}=${encodeURIComponent(token)}; path=/; max-age=${MAX_AGE}; SameSite=Lax`;
}

export function clearAdminAuthCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE_ADMIN}=; path=/; max-age=0`;
}

function safeDecodeCookieValue(encoded: string): string | null {
  try {
    return decodeURIComponent(encoded);
  } catch {
    return null;
  }
}

export function getAppAuthCookie(request: Request): string | null {
  const cookie = request.headers.get("cookie");
  if (!cookie) return null;
  const match = cookie.match(new RegExp(`(?:^|; )${COOKIE_APP}=([^;]*)`));
  return match ? safeDecodeCookieValue(match[1]!) : null;
}

export function getAdminAuthCookie(request: Request): string | null {
  const cookie = request.headers.get("cookie");
  if (!cookie) return null;
  const match = cookie.match(new RegExp(`(?:^|; )${COOKIE_ADMIN}=([^;]*)`));
  return match ? safeDecodeCookieValue(match[1]!) : null;
}
