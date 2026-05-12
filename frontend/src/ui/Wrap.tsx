"use client";

import { forwardRef } from "react";

export interface WrapProps extends React.HTMLAttributes<HTMLDivElement> {
  spacing?: number;
  children: React.ReactNode;
}

export const Wrap = forwardRef<HTMLDivElement, WrapProps>(
  ({ spacing = 2, className = "", children, ...props }, ref) => {
    const gap = spacing * 0.25;
    return (
      <div
        ref={ref}
        className={`flex flex-wrap ${className}`}
        style={{ gap: `${gap}rem` }}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Wrap.displayName = "Wrap";

export function WrapItem({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={className}>{children}</div>;
}
