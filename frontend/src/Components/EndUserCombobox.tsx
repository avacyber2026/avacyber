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
import { IoChevronDown } from "react-icons/io5";
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
      setStyle({
        position: "fixed",
        left,
        width,
        bottom: Math.max(12, vh - r.top + gap),
        maxHeight: maxH,
        zIndex: 10050,
      });
    } else {
      setStyle({
        position: "fixed",
        top: r.bottom + gap,
        left,
        width,
        maxHeight: maxH,
        zIndex: 10050,
      });
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

export interface EndUserComboboxProps {
  value: string;
  onChange: (email: string) => void;
  users: EndUserOption[];
  loading?: boolean;
  disabled?: boolean;
  placeholder: string;
  searchPlaceholder: string;
  emptyListMessage?: string;
  noMatchMessage?: string;
  className?: string;
  /** Max height (px) of the scrollable results area below the search field */
  maxResultsHeight?: number;
}

export function EndUserCombobox({
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
}: EndUserComboboxProps) {
  const autoId = useId();
  const listboxId = `${autoId}-listbox`;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);

  const selected = useMemo(
    () => users.find((u) => u.email === value) ?? null,
    [users, value]
  );

  const triggerLabel = loading
    ? "…"
    : selected
      ? endUserPickerLabelOrFallback(selected, placeholder)
      : placeholder;

  const filtered = useMemo(
    () => users.filter((u) => endUserMatchesQuery(u, query)),
    [users, query]
  );

  const { style: panelStyle, update } = usePanelPosition(
    open,
    triggerRef,
    maxResultsHeight + 120
  );

  useEffect(() => {
    if (!open) return;
    setHighlight(0);
    setQuery("");
    const t = requestAnimationFrame(() => {
      searchRef.current?.focus();
      update();
    });
    return () => cancelAnimationFrame(t);
  }, [open, update]);

  useEffect(() => {
    setHighlight(0);
  }, [query]);

  useEffect(() => {
    setHighlight((h) => Math.min(h, Math.max(0, filtered.length - 1)));
  }, [filtered.length]);

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

  const pick = useCallback(
    (email: string) => {
      onChange(email);
      setOpen(false);
      setQuery("");
    },
    [onChange]
  );

  const onKeySearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, Math.max(0, filtered.length - 1)));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    }
    if (e.key === "Enter" && filtered.length > 0) {
      e.preventDefault();
      const u = filtered[highlight];
      if (u) pick(u.email);
    }
  };

  useEffect(() => {
    if (!open || !panelRef.current) return;
    const el = panelRef.current.querySelector(`[data-idx="${highlight}"]`) as HTMLElement | null;
    el?.scrollIntoView({ block: "nearest" });
  }, [highlight, open]);

  const triggerClass = [
    "group relative flex w-full min-w-0 items-center justify-between rounded-lg border text-left font-medium",
    "border-[#1F6A5C]/20/90 bg-white/95 text-[#103E36] shadow-sm backdrop-blur-sm",
    "dark:border-white/15 dark:bg-[#192420] dark:text-[#F4F3F4]",
    "transition-[box-shadow,transform,border-color] duration-200 ease-out",
    "hover:border-[#1F6A5C]/25 hover:shadow-md dark:hover:border-white/25",
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/70 focus-visible:border-brand-primary",
    "disabled:cursor-not-allowed disabled:opacity-50",
    "h-9 min-h-9 text-sm px-3 gap-2",
    className,
  ].join(" ");

  const panel =
    typeof document !== "undefined" ? (
      <AnimatePresence>
        {open ? (
          <motion.div
            key={listboxId}
            ref={panelRef}
            id={listboxId}
            role="listbox"
            aria-label={searchPlaceholder}
            initial={{ opacity: 0, y: -6, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.99 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            style={panelStyle}
            className={[
              "flex flex-col overflow-hidden rounded-xl border py-2 shadow-xl",
              "border-[#1F6A5C]/20/80 bg-white/98 text-[#1C1E1C] backdrop-blur-md",
              "dark:border-white/12 dark:bg-[#1e211e]/98 dark:text-[#F4F3F4]",
              "ring-1 ring-black/[0.04] dark:ring-white/[0.06]",
            ].join(" ")}
          >
            <div className="px-2 pb-2 shrink-0 border-b border-[#1F6A5C]/20/70 dark:border-white/10">
              <div className="relative">
                <FiSearch
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#1F6A5C]/60 dark:text-[#1F6A5C]/70 pointer-events-none"
                  size={16}
                  aria-hidden
                />
                <input
                  ref={searchRef}
                  type="text"
                  inputMode="search"
                  enterKeyHint="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={onKeySearch}
                  placeholder={searchPlaceholder}
                  className="w-full rounded-lg border border-[#1F6A5C]/20/90 dark:border-white/15 bg-white dark:bg-[#192420] pl-9 pr-3 py-2 text-sm text-[#1C1E1C] dark:text-[#F4F3F4] placeholder:text-[#1F6A5C]/60 dark:placeholder:text-[#1F6A5C]/70 focus:outline-none focus:ring-2 focus:ring-brand-primary/60"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                />
              </div>
            </div>
            <div
              className="ui-select-listbox overflow-y-auto overflow-x-hidden px-1.5 pt-1 min-h-0"
              style={{ maxHeight: maxResultsHeight }}
            >
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
                  const isSel = u.email === value;
                  return (
                    <button
                      key={u.email}
                      type="button"
                      role="option"
                      data-idx={idx}
                      aria-selected={isSel}
                      aria-label={label}
                      className={[
                        "flex w-full items-center rounded-lg px-3 py-2.5 text-left text-sm font-medium truncate transition-colors duration-150",
                        isHi
                          ? "bg-[#1F6A5C]/10 text-[#0d4f42] dark:bg-[#50BFA0]/12 dark:text-[#a5e8d4]"
                          : "text-[#103E36] dark:text-[#F4F3F4]/80",
                        "hover:bg-[#F4F3F4]/90 dark:hover:bg-white/[0.07]",
                        isSel && !isHi ? "bg-[#F4F3F4]/50/80 dark:bg-white/[0.04]" : "",
                      ].join(" ")}
                      onMouseEnter={() => setHighlight(idx)}
                      onClick={() => pick(u.email)}
                    >
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
    <div className="relative min-w-0 w-full">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled || loading}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? listboxId : undefined}
        className={triggerClass}
        onClick={() => {
          if (disabled || loading) return;
          setOpen((o) => !o);
          if (!open) update();
        }}
        onKeyDown={(e) => {
          if (disabled || loading) return;
          if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (!open) {
              setOpen(true);
              update();
            }
          }
          if (e.key === "Escape") setOpen(false);
        }}
      >
        <span className="min-w-0 flex-1 truncate text-left opacity-95">{triggerLabel}</span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="shrink-0 text-[#1F6A5C]/70 dark:text-[#1F6A5C]/60"
        >
          <IoChevronDown size={18} aria-hidden />
        </motion.span>
      </button>
      {panel ? createPortal(panel, document.body) : null}
    </div>
  );
}
