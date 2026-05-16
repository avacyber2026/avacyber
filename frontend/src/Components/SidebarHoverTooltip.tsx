"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

type SidebarHoverTooltipProps = {
  label: string;
  children: React.ReactNode;
  /** Collapsed / icon-only sidebar */
  enabled: boolean;
};

/**
 * Tooltip fixed to viewport (portal) so it is not clipped by sidebar overflow-hidden.
 * Shows on hover/focus over the entire wrapped control.
 */
export function SidebarHoverTooltip({ label, children, enabled }: SidebarHoverTooltipProps) {
  const wrapRef = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const updatePosition = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setCoords({ top: r.top + r.height / 2, left: r.right + 10 });
  }, []);

  const show = useCallback(() => {
    if (!enabled || !label.trim()) return;
    updatePosition();
    setVisible(true);
  }, [enabled, label, updatePosition]);

  const hide = useCallback(() => setVisible(false), []);

  useEffect(() => {
    if (!visible) return;
    const onScroll = () => hide();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [visible, hide]);

  useEffect(() => {
    if (!visible) return;
    updatePosition();
  }, [visible, updatePosition]);

  if (!enabled) {
    return <>{children}</>;
  }

  const tooltip =
    visible && typeof document !== "undefined"
      ? createPortal(
          <div
            role="tooltip"
            className="pointer-events-none fixed z-[9999] max-w-[min(240px,calc(100vw-24px))] -translate-y-1/2 rounded-lg border border-white/15 bg-[#103E36]/95 px-3 py-2 text-left text-xs font-medium leading-snug text-white shadow-lg backdrop-blur-sm dark:border-white/10 dark:bg-[#F4F3F4]/95 dark:text-[#F4F3F4]"
            style={{ top: coords.top, left: coords.left }}
          >
            {label}
          </div>,
          document.body
        )
      : null;

  return (
    <span
      ref={wrapRef}
      className="inline-flex w-full min-w-0 justify-center"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocusCapture={show}
      onBlurCapture={hide}
    >
      {children}
      {tooltip}
    </span>
  );
}
