import toast from "react-hot-toast";

let lastNotifiedEndsAt: number | null = null;

/** Same session end timestamp only fires user-visible notify once (dashboard tick + global watcher). */
export function notifyFocusTimerDone(endsAt: number, title: string, body: string): void {
  if (typeof window === "undefined") return;
  if (lastNotifiedEndsAt === endsAt) return;
  lastNotifiedEndsAt = endsAt;

  try {
    toast.success(body ? `${title}\n${body}` : title, { duration: 7000 });
  } catch {
    /* ignore: Toaster not ready or toast runtime error */
  }

  try {
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      new Notification(title, { body, tag: "sc-focus-timer" });
    }
  } catch {
    /* ignore */
  }

  try {
    const orig = document.title;
    const prefix = `✓ ${title} — `;
    if (!orig.startsWith(prefix)) {
      document.title = prefix + orig;
      window.setTimeout(() => {
        document.title = orig;
      }, 8000);
    }
  } catch {
    /* ignore */
  }
}
