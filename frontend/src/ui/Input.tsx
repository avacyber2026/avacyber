"use client";

import { forwardRef } from "react";

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  size?: "sm" | "md" | "lg";
  isInvalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ size = "md", isInvalid, className = "", ...props }, ref) => {
    const sizeClasses =
      size === "sm"
        ? "h-8 text-sm px-3"
        : size === "lg"
        ? "h-10 text-base px-4"
        : "h-9 text-sm px-3";
    const base =
      "w-full rounded-md border bg-white dark:bg-[#1E2128] border-[#1F6A5C]/20 dark:border-white/20 text-[#103E36] dark:text-white placeholder-[#1F6A5C]/50 dark:placeholder-[#1F6A5C]/50 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-colors";
    const invalid = isInvalid ? "border-red-500 focus:ring-red-500" : "";
    return (
      <input
        ref={ref}
        className={`${base} ${sizeClasses} ${invalid} ${className}`}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";
