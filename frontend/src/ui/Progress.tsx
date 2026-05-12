"use client";

import { forwardRef } from "react";

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  size?: "xs" | "sm" | "md" | "lg";
  colorScheme?: string;
  borderRadius?: string | number;
  isIndeterminate?: boolean;
}

export const Progress = forwardRef<HTMLDivElement, ProgressProps>(
  (
    {
      value = 0,
      size = "md",
      colorScheme = "brand",
      borderRadius,
      isIndeterminate,
      className = "",
      ...props
    },
    ref
  ) => {
    const heightMap = { xs: "2px", sm: "4px", md: "8px", lg: "12px" };
    const bgClass =
      colorScheme === "green" || colorScheme === "brand"
        ? "bg-brand-primary"
        : "bg-gray-200 dark:bg-gray-600";

    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuenow={isIndeterminate ? undefined : value}
        aria-valuemin={0}
        aria-valuemax={100}
        className={`w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-600 ${className}`}
        style={{ height: heightMap[size] }}
        {...props}
      >
        <div
          className={`h-full rounded-full ${bgClass} ${isIndeterminate ? "animate-pulse" : ""}`}
          style={{
            width: isIndeterminate ? "100%" : `${Math.min(100, Math.max(0, value))}%`,
            transition: "width 0.3s ease",
          }}
        />
      </div>
    );
  }
);

Progress.displayName = "Progress";
