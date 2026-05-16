"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  useId,
  forwardRef,
} from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { IoChevronDown, IoCheckmark } from "react-icons/io5";

export type SelectOption = {
  value: string;
  label: React.ReactNode;
  disabled?: boolean;
};

export interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  /** Shown when value is empty or missing from options */
  placeholder?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  disabled?: boolean;
  id?: string;
  "aria-label"?: string;
  /** Max height of dropdown (px) */
  maxListHeight?: number;
}

function useDropdownPosition(
  open: boolean,
  triggerRef: React.RefObject<HTMLElement | null>
) {
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0, flip: false });

  const update = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const gap = 6;
    const maxH = 280;
    const below = r.bottom + gap + maxH;
    const flip = below > window.innerHeight - 12 && r.top > maxH + gap;
    setPos({
      top: flip ? r.top - gap : r.bottom + gap,
      left: r.left,
      width: Math.max(r.width, 160),
      flip,
    });
  }, [triggerRef]);

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

  return { ...pos, update };
}

export const Select = forwardRef<HTMLButtonElement, SelectProps>(function Select(
  {
    value,
    onChange,
    options,
    placeholder = "",
    size = "md",
    className = "",
    disabled = false,
    id: idProp,
    "aria-label": ariaLabel,
    maxListHeight = 280,
  },
  ref
) {
  const autoId = useId();
  const listboxId = `${autoId}-listbox`;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);

  const { top, left, width, flip, update } = useDropdownPosition(open, triggerRef);

  const enabledOptions = useMemo(
    () => options.filter((o) => !o.disabled),
    [options]
  );

  const flatIndexByValue = useMemo(() => {
    const m = new Map<string, number>();
    enabledOptions.forEach((o, i) => m.set(o.value, i));
    return m;
  }, [enabledOptions]);

  const selectedOption = options.find((o) => o.value === value);
  const displayLabel =
    selectedOption?.label ?? (value ? value : placeholder);

  const sizeClasses =
    size === "sm"
      ? "h-8 min-h-8 text-sm px-3 gap-2"
      : size === "lg"
        ? "h-10 min-h-10 text-base px-4 gap-2"
        : "h-9 min-h-9 text-sm px-3 gap-2";

  const close = useCallback(() => setOpen(false), []);

  const selectIndex = useCallback(
    (idx: number) => {
      const o = enabledOptions[idx];
      if (o) {
        onChange(o.value);
        close();
      }
    },
    [enabledOptions, onChange, close]
  );

  useEffect(() => {
    if (!open) return;
    const v = flatIndexByValue.get(value);
    if (v != null) setHighlight(v);
    else setHighlight(0);
  }, [open, value, flatIndexByValue]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (listRef.current?.contains(t)) return;
      close();
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, close]);

  const onKeyDownBtn = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        update();
      } else {
        setHighlight((h) => Math.min(h + 1, Math.max(0, enabledOptions.length - 1)));
      }
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        update();
      } else {
        setHighlight((h) => Math.max(h - 1, 0));
      }
    }
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        update();
      } else {
        selectIndex(highlight);
      }
    }
    if (e.key === "Escape") close();
  };

  const onKeyDownList = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
      triggerRef.current?.focus();
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, enabledOptions.length - 1));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    }
    if (e.key === "Enter") {
      e.preventDefault();
      selectIndex(highlight);
      triggerRef.current?.focus();
    }
    if (e.key === "Home") {
      e.preventDefault();
      setHighlight(0);
    }
    if (e.key === "End") {
      e.preventDefault();
      setHighlight(Math.max(0, enabledOptions.length - 1));
    }
  };

  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-idx="${highlight}"]`) as HTMLElement | null;
    el?.scrollIntoView({ block: "nearest" });
  }, [highlight, open]);

  const triggerClass = [
    "group relative flex w-full min-w-0 items-center justify-between rounded-lg border text-left font-medium",
    "border-[#1F6A5C]/20 bg-white/95 text-[#103E36] shadow-sm backdrop-blur-sm",
    "dark:border-white/15 dark:bg-[#1E2128] dark:text-[#F4F3F4]",
    "transition-[box-shadow,transform,border-color] duration-200 ease-out",
    "hover:border-[#1F6A5C]/25 hover:shadow-md dark:hover:border-white/25 dark:hover:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.65)]",
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/70 focus-visible:border-brand-primary",
    "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-sm disabled:hover:border-[#1F6A5C]/20 dark:disabled:hover:border-white/15",
    sizeClasses,
    className,
  ].join(" ");

  const listStyle: React.CSSProperties = flip
    ? {
        position: "fixed",
        left,
        width,
        bottom: Math.max(12, window.innerHeight - top),
        maxHeight: maxListHeight,
        zIndex: 10050,
      }
    : {
        position: "fixed",
        top,
        left,
        width,
        maxHeight: maxListHeight,
        zIndex: 10050,
      };

  const dropdownPortal =
    typeof document !== "undefined" ? (
      <AnimatePresence>
        {open ? (
          <motion.div
            key={listboxId}
            ref={listRef}
            id={listboxId}
            role="listbox"
            tabIndex={-1}
            aria-activedescendant={
              enabledOptions[highlight]
                ? `${listboxId}-opt-${enabledOptions[highlight].value}`
                : undefined
            }
            initial={{ opacity: 0, y: flip ? 8 : -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: flip ? 4 : -4, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            style={listStyle}
            onKeyDown={onKeyDownList}
            className={[
              "ui-select-listbox overflow-y-auto overflow-x-hidden rounded-xl border py-1.5 shadow-xl",
              "border-[#1F6A5C]/20 bg-white/98 text-[#1C1E1C] backdrop-blur-md",
              "dark:border-white/12 dark:bg-[#1e211e]/98 dark:text-[#F4F3F4]",
              "ring-1 ring-black/[0.04] dark:ring-white/[0.06]",
            ].join(" ")}
          >
            {options.map((opt) => {
              if (opt.disabled) {
                return (
                  <div
                    key={opt.value}
                    className="px-3 py-2 text-sm text-[#1F6A5C]/60 dark:text-[#1F6A5C]/70 cursor-default"
                  >
                    {opt.label}
                  </div>
                );
              }
              const idx = flatIndexByValue.get(opt.value);
              const isHi = idx === highlight;
              const isSel = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  id={`${listboxId}-opt-${opt.value}`}
                  data-idx={idx}
                  aria-selected={isSel}
                  className={[
                    "flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors duration-150",
                    isHi
                      ? "bg-[#1F6A5C]/10 text-[#0d4f42] dark:bg-[#50BFA0]/12 dark:text-[#a5e8d4]"
                      : "text-[#103E36] dark:text-[#F4F3F4]/80",
                    "hover:bg-[#F4F3F4]/90 dark:hover:bg-white/[0.07]",
                    isSel && !isHi ? "bg-[#F4F3F4]/50 dark:bg-white/[0.04]" : "",
                  ].join(" ")}
                  onMouseEnter={() => idx != null && setHighlight(idx)}
                  onClick={() => idx != null && selectIndex(idx)}
                >
                  <span className="flex-1 min-w-0 truncate">{opt.label}</span>
                  {isSel ? (
                    <IoCheckmark
                      className="shrink-0 text-[#1F6A5C] dark:text-[#50BFA0]"
                      size={18}
                      aria-hidden
                    />
                  ) : (
                    <span className="w-[18px] shrink-0" aria-hidden />
                  )}
                </button>
              );
            })}
          </motion.div>
        ) : null}
      </AnimatePresence>
    ) : null;

  return (
    <div className="relative min-w-0">
      <button
        ref={(node) => {
          (triggerRef as React.MutableRefObject<HTMLButtonElement | null>).current = node;
          if (typeof ref === "function") ref(node);
          else if (ref) ref.current = node;
        }}
        type="button"
        id={idProp}
        className={triggerClass}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? listboxId : undefined}
        onClick={() => {
          if (disabled) return;
          setOpen((o) => !o);
          if (!open) update();
        }}
        onKeyDown={onKeyDownBtn}
      >
        <span className="min-w-0 flex-1 truncate text-left opacity-95">{displayLabel}</span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="shrink-0 text-[#1F6A5C]/70 dark:text-[#1F6A5C]/60 group-hover:text-[#103E36] dark:group-hover:text-[#F4F3F4]/80"
        >
          <IoChevronDown size={18} aria-hidden />
        </motion.span>
      </button>
      {dropdownPortal ? createPortal(dropdownPortal, document.body) : null}
    </div>
  );
});

Select.displayName = "Select";
