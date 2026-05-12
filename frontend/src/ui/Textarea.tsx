"use client";

import { forwardRef } from "react";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  size?: "sm" | "md" | "lg";
  isInvalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ size = "md", isInvalid, className = "", ...props }, ref) => {
    const sizeClasses =
      size === "sm"
        ? "text-sm p-2"
        : size === "lg"
        ? "text-base p-4"
        : "text-sm p-3";
    const base =
      "w-full rounded-md border bg-white dark:bg-[#2c2f2c] border-gray-200 dark:border-white/20 text-gray-800 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary resize-y min-h-[80px]";
    const invalid = isInvalid ? "border-red-500" : "";
    return (
      <textarea
        ref={ref}
        className={`${base} ${sizeClasses} ${invalid} ${className}`}
        {...props}
      />
    );
  }
);

Textarea.displayName = "Textarea";
