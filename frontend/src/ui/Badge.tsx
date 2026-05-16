"use client";

import { forwardRef } from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  colorScheme?: "gray" | "green" | "red" | "blue" | "yellow" | "brand";
  variant?: "solid" | "subtle" | "outline";
  size?: "sm" | "md" | "lg";
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      colorScheme = "gray",
      variant = "subtle",
      size = "md",
      className = "",
      ...props
    },
    ref
  ) => {
    const sizeCls =
      size === "sm" ? "text-xs px-1.5 py-0" : size === "lg" ? "text-sm px-2.5 py-1" : "text-xs px-2 py-0.5";
    const colorMap: Record<string, string> = {
      gray: "bg-[#F4F3F4] text-[#103E36] dark:bg-[#1F6A5C] dark:text-[#F4F3F4]/80",
      green: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
      red: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
      blue: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
      yellow: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
      brand: "bg-brand-primary/20 text-brand-primary dark:bg-brand-primary/30 dark:text-brand-primaryLight",
    };
    const outlineMap: Record<string, string> = {
      gray: "border border-[#1F6A5C]/25 dark:border-[#1F6A5C]/60 text-[#103E36] dark:text-[#F4F3F4]/65",
      green: "border border-green-300 dark:border-green-600 text-green-700 dark:text-green-300",
      red: "border border-red-300 dark:border-red-600 text-red-700 dark:text-red-300",
      blue: "border border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-300",
      yellow: "border border-yellow-300 dark:border-yellow-600 text-yellow-700 dark:text-yellow-300",
      brand: "border border-brand-primary text-brand-primary",
    };
    const cls =
      variant === "outline"
        ? outlineMap[colorScheme] ?? outlineMap.gray
        : colorMap[colorScheme] ?? colorMap.gray;
    return (
      <span
        ref={ref}
        className={`inline-flex items-center font-medium rounded ${sizeCls} ${cls} ${className}`}
        {...props}
      />
    );
  }
);

Badge.displayName = "Badge";
