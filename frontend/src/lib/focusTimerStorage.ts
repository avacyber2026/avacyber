/** Shared with dashboard card and global expiry watcher */
export const FOCUS_TIMER_STORAGE_KEY = "sc-dashboard-focus-timer-v2";

/** Same-tab + optional cross-component sync (storage event covers other tabs). */
export const FOCUS_TIMER_CHANGED_EVENT = "sc-focus-timer-changed";

export type FocusPhase = "setting" | "running" | "paused" | "done";

export type FocusTimerPersistV2 = {
  v: 2;
  phase: FocusPhase;
  selectedSec: number;
  totalSec: number;
  remainingSec: number;
  endsAt: number | null;
};

export function dispatchFocusTimerChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(FOCUS_TIMER_CHANGED_EVENT));
}
