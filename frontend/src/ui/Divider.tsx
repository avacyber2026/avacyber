"use client";

import { forwardRef } from "react";

export interface DividerProps extends React.HTMLAttributes<HTMLHRElement> {
  orientation?: "horizontal" | "vertical";
  borderColor?: string;
}

export const Divider = forwardRef<HTMLHRElement, DividerProps>(
  (
    {
      orientation = "horizontal",
      borderColor,
      className = "",
      style,
      ...props
    },
    ref
  ) => {
    const base =
      orientation === "horizontal"
        ? "w-full border-t"
        : "h-full border-l border-t-0 border-r-0 border-b-0";
    const colorClass =
      borderColor === "sidebar.cardBorder" || borderColor === "sidebar.border"
        ? "border-gray-200 dark:border-white/10"
        : "";
    return (
      <hr
        ref={ref}
        role="separator"
        className={`${base} ${colorClass} ${className}`}
        style={{
          ...(borderColor && !colorClass
            ? { borderColor: borderColor as string }
            : {}),
          ...style,
        }}
        {...props}
      />
    );
  }
);

Divider.displayName = "Divider";
