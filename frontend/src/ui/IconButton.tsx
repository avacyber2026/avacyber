"use client";

import { forwardRef } from "react";

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  "aria-label": string;
  icon?: React.ReactNode;
  variant?: "solid" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  minW?: number | string;
  _hover?: Record<string, unknown>;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      icon,
      variant = "ghost",
      size = "md",
      className = "",
      children,
      minW,
      _hover,
      ...props
    },
    ref
  ) => {
    const base =
      "inline-flex items-center justify-center rounded-md transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 disabled:opacity-50 ";
    const sizeClasses =
      size === "sm" ? "h-8 w-8" : size === "lg" ? "h-10 w-10" : "h-9 w-9";
    const variantClasses =
      variant === "ghost"
        ? "text-[#103E36] dark:text-[#F4F3F4]/65 hover:bg-[#F4F3F4] dark:hover:bg-white/10"
        : variant === "outline"
        ? "border border-[#1F6A5C]/20 dark:border-white/20 hover:bg-[#F4F3F4]/50 dark:hover:bg-white/10"
        : "bg-brand-primary text-white hover:bg-brand-primaryDark";
    const minWidthClass = minW === 0 ? "min-w-0" : "";
    const cls = `${base} ${sizeClasses} ${variantClasses} ${minWidthClass} ${className}`.trim();
    return (
      <button ref={ref} className={cls} {...props}>
        {icon ?? children}
      </button>
    );
  }
);

IconButton.displayName = "IconButton";
