"use client";

import { forwardRef } from "react";

export interface IconProps extends React.HTMLAttributes<HTMLSpanElement> {
  as: React.ElementType;
  boxSize?: number | string;
}

export const Icon = forwardRef<HTMLSpanElement, IconProps>(
  ({ as: Comp, boxSize = 4, className = "", ...props }, ref) => {
    const size =
      typeof boxSize === "number" ? `${boxSize * 0.25}rem` : boxSize;
    return (
      <span
        ref={ref}
        className={`inline-flex shrink-0 ${className}`}
        style={{ width: size, height: size }}
        {...props}
      >
        <Comp style={{ width: "100%", height: "100%" }} />
      </span>
    );
  }
);

Icon.displayName = "Icon";
