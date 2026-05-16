"use client";

import { forwardRef } from "react";

export interface InputGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
}

export const InputGroup = forwardRef<HTMLDivElement, InputGroupProps>(
  ({ size = "md", className = "", children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`relative flex w-full ${className}`}
        data-size={size}
        {...props}
      >
        {children}
      </div>
    );
  }
);

InputGroup.displayName = "InputGroup";

export const InputLeftElement = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { width?: string; height?: string }
>(({ className = "", children, width, height, ...props }, ref) => (
  <div
    ref={ref}
    className={`absolute left-0 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none text-[#1C1E1C]/70 dark:text-[#F4F3F4]/55 ${className}`}
    style={{ width: width ?? "2.5rem", height: height ?? "calc(100% - 4px)" }}
    {...props}
  >
    {children}
  </div>
));

InputLeftElement.displayName = "InputLeftElement";

export const InputRightElement = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    width?: string;
    height?: string;
    right?: string;
    top?: string;
    bottom?: string;
    bg?: string;
    borderRadius?: string;
  }
>(
  (
    {
      className = "",
      children,
      width = "3rem",
      height = "calc(100% - 4px)",
      right = "2px",
      top: _top,
      bottom: _bottom,
      ...props
    },
    ref
  ) => (
    <div
      ref={ref}
      className={`absolute right-0 top-1/2 -translate-y-1/2 flex items-center justify-center ${className}`}
      style={{ width, height, right }}
      {...props}
    >
      {children}
    </div>
  )
);

InputRightElement.displayName = "InputRightElement";
