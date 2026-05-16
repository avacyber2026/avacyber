"use client";

import {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
  useId,
} from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { IoChevronDown, IoCloseCircleOutline } from "react-icons/io5";
import { FiSearch } from "react-icons/fi";
import type { EndUserOption } from "@/lib/endUserDisplay";
import { endUserMatchesQuery, endUserPickerLabelOrFallback } from "@/lib/endUserDisplay";

function usePanelPosition(
  open: boolean,
  anchorRef: React.RefObject<HTMLElement | null>,
  maxPanelHeight: number
) {
  const [style, setStyle] = useState<React.CSSProperties>({});

  const update = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const gap = 6;
    const vw = typeof window !== "undefined" ? window.innerWidth : 0;
    const vh = typeof window !== "undefined" ? window.innerHeight : 0;
    const width = Math.max(r.width, 220);
    let left = r.left;
    if (left + width > vw - 8) left = Math.max(8, vw - width - 8);
    const belowSpace = vh - r.bottom - gap - 12;
    const aboveSpace = r.top - gap - 12;
    const flip = belowSpace < Math.min(maxPanelHeight, 200) && aboveSpace > belowSpace;
    const maxH = Math.min(maxPanelHeight, flip ? aboveSpace : belowSpace);
    if (flip) {
      setStyle({ position: "fixed", left, width, bottom: Math.max(12, vh - r.top + gap), maxHeight: maxH, zIndex: 10050 });
    } else {
      setStyle({ position: "fixed", top: r.bottom + gap, left, width, maxHeight: maxH, zIndex: 10050 });
    }
  }, [anchorRef, maxPanelHeight]);

  useEffect(() => {
    if (!open) return;
    update();
    const onScroll = () => update();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open, update]);

  return { style, update };
}

export interface EndUserMultiComboboxProps {
  value: string[];
  onChange: (emails: string[]) => void;
  users: EndUserOption[];
  loading?: boolean;
  disabled?: boolean;
  placeholder: string;
  searchPlaceholder: string;
  emptyListMessage?: string;
  noMatchMessage?: string;
  className?: string;
  maxResultsHeight?: number;
}

export function EndUserMultiCombobox({
  value,
  onChange,
  users,
  loading = false,
  disabled = false,
  placeholder,
  searchPlaceholder,
  emptyListMessage = "No users",
  noMatchMessage = "No matching users",
  className = "",
  maxResultsHeight = 260,
}: EndUserMultiComboboxProps) {
  const autoId = useId();
  const listboxId = `${autoId}-listbox`;
  const triggerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);

  const selectedSet = useMemo(() => new Set(value), [value]);

  const triggerLabel = loading
    ? "…"
    : value.length === 0
      ? placeholder
      : `${value.length} selected`;

  const filtered = useMemo(
    () => users.filter((u) => endUserMatchesQuery(u, query)),
    [users, query]
  );

  const { style: panelStyle, update } = usePanelPosition(open, triggerRef, maxResultsHeight + 120);

  useEffect(() => {
    if (!open) return;
    setHighlight(0);
    setQuery("");
    const t = requestAnimationFrame(() => { searchRef.current?.focus(); update(); });
    return () => cancelAnimationFrame(t);
  }, [open, update]);

  useEffect(() => { setHighlight(0); }, [query]);
  useEffect(() => { setHighlight((h) => Math.min(h, Math.max(0, filtered.length - 1))); }, [filtered.length]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const toggle = useCallback(
    (email: string) => {
      if (selectedSet.has(email)) {
        onChange(value.filter((e) => e !== email));
      } else {
        onChange([...value, email]);
      }
    },
    [onChange, value, selectedSet]
  );

  const onKeySearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") { e.preventDefault(); setOpen(false); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlight((h) => Math.min(h + 1, Math.max(0, filtered.length - 1))); }
    if (e.key === "ArrowUp") { e.preventDefault(); setHighlight((h) => Math.max(h - 1, 0)); }
    if (e.key === "Enter" && filtered.length > 0) { e.preventDefault(); const u = filtered[highlight]; if (u) toggle(u.email); }
  };

  useEffect(() => {
    if (!open || !panelRef.current) return;
    const el = panelRef.current.querySelector(`[data-idx="${highlight}"]`) as HTMLElement | null;
    el?.scrollIntoView({ block: "nearest" });
  }, [highlight, open]);

  const selectedUsers = useMemo(
    () => value.map((em) => users.find((u) => u.email === em)).filter(Boolean) as EndUserOption[],
    [value, users]
  );

  const panel =
    typeof document !== "undefined" ? (
      <AnimatePresence>
        {open ? (
          <motion.div
            key={listboxId}
            ref={panelRef}
            id={listboxId}
            role="listbox"
            aria-multiselectable
            initial={{ opacity: 0, y: -6, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.99 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            style={panelStyle}
            className="flex flex-col overflow-hidden rounded-xl border py-2 shadow-xl border-[#1F6A5C]/20 bg-white/98 text-[#1C1E1C] backdrop-blur-md dark:border-white/12 dark:bg-[#1e211e]/98 dark:text-[#F4F3F4] ring-1 ring-black/[0.04] dark:ring-white/[0.06]"
          >
            <div className="px-2 pb-2 shrink-0 border-b border-[#1F6A5C]/20 dark:border-white/10">
              <div className="relative">
                <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#1F6A5C]/60 dark:text-[#1F6A5C]/70 pointer-events-none" size={16} />
                <input
                  ref={searchRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={onKeySearch}
                  placeholder={searchPlaceholder}
                  className="w-full rounded-lg border border-[#1F6A5C]/20 dark:border-white/15 bg-white dark:bg-[#1E2128] pl-9 pr-3 py-2 text-sm text-[#1C1E1C] dark:text-[#F4F3F4] placeholder:text-[#1F6A5C]/60 dark:placeholder:text-[#1F6A5C]/70 focus:outline-none focus:ring-2 focus:ring-brand-primary/60"
                  autoComplete="off"
                />
              </div>
            </div>
            <div className="overflow-y-auto overflow-x-hidden px-1.5 pt-1 min-h-0" style={{ maxHeight: maxResultsHeight }}>
              {loading ? (
                <div className="px-3 py-4 text-sm text-[#1F6A5C]/70 text-center">…</div>
              ) : users.length === 0 ? (
                <div className="px-3 py-4 text-sm text-[#1F6A5C]/70 text-center">{emptyListMessage}</div>
              ) : filtered.length === 0 ? (
                <div className="px-3 py-4 text-sm text-[#1F6A5C]/70 text-center">{noMatchMessage}</div>
              ) : (
                filtered.map((u, idx) => {
                  const label = endUserPickerLabelOrFallback(u, "—");
                  const isHi = idx === highlight;
                  const isSel = selectedSet.has(u.email);
                  return (
                    <button
                      key={u.email}
                      type="button"
                      role="option"
                      data-idx={idx}
                      aria-selected={isSel}
                      className={[
                        "flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium truncate transition-colors duration-150",
                        isHi ? "bg-[#1F6A5C]/10 text-[#0d4f42] dark:bg-[#50BFA0]/12 dark:text-[#a5e8d4]" : "text-[#103E36] dark:text-[#F4F3F4]/80",
                        "hover:bg-[#F4F3F4]/90 dark:hover:bg-white/[0.07]",
                      ].join(" ")}
                      onMouseEnter={() => setHighlight(idx)}
                      onClick={() => toggle(u.email)}
                    >
                      <input type="checkbox" readOnly checked={isSel} className="rounded border-[#1F6A5C]/25 dark:border-white/30 text-brand-primary pointer-events-none" tabIndex={-1} />
                      {label}
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    ) : null;

  return (
    <div className={`relative min-w-0 w-full ${className}`}>
      <div
        ref={triggerRef}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        tabIndex={0}
        className={[
          "group relative flex w-full min-w-0 items-center justify-between rounded-lg border text-left font-medium cursor-pointer",
          "border-[#1F6A5C]/20 bg-white/95 text-[#103E36] shadow-sm backdrop-blur-sm",
          "dark:border-white/15 dark:bg-[#1E2128] dark:text-[#F4F3F4]",
          "transition-[box-shadow,transform,border-color] duration-200 ease-out",
          "hover:border-[#1F6A5C]/25 hover:shadow-md dark:hover:border-white/25",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/70",
          disabled ? "cursor-not-allowed opacity-50" : "",
          "min-h-9 text-sm px-3 py-1.5 gap-2 flex-wrap",
        ].join(" ")}
        onClick={() => { if (!disabled && !loading) { setOpen((o) => !o); if (!open) update(); } }}
        onKeyDown={(e) => {
          if (disabled || loading) return;
          if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") { e.preventDefault(); if (!open) { setOpen(true); update(); } }
          if (e.key === "Escape") setOpen(false);
        }}
      >
        {selectedUsers.length === 0 ? (
          <span className="min-w-0 flex-1 truncate text-left opacity-60">{triggerLabel}</span>
        ) : (
          <div className="flex flex-wrap gap-1 min-w-0 flex-1">
            {selectedUsers.map((u) => (
              <span key={u.email} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#F4F3F4] dark:bg-white/10 text-xs font-medium">
                {endUserPickerLabelOrFallback(u, u.email)}
                <button
                  type="button"
                  className="shrink-0 text-[#1F6A5C]/70 hover:text-red-500 dark:hover:text-red-400"
                  onClick={(e) => { e.stopPropagation(); onChange(value.filter((em) => em !== u.email)); }}
                >
                  <IoCloseCircleOutline size={14} />
                </button>
              </span>
            ))}
          </div>
        )}
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }} className="shrink-0 text-[#1F6A5C]/70 dark:text-[#1F6A5C]/60">
          <IoChevronDown size={18} />
        </motion.span>
      </div>
      {panel ? createPortal(panel, document.body) : null}
    </div>
  );
}
