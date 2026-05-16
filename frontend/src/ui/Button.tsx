"use client";

import { forwardRef } from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  href?: string;
  target?: string;
  rel?: string;
  htmlFor?: string;
  variant?: "solid" | "outline" | "ghost";
  colorScheme?: string;
  size?: "sm" | "md" | "lg";
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isLoading?: boolean;
  isDisabled?: boolean;
  as?: React.ElementType;
  whileHover?: Record<string, unknown>;
  whileTap?: Record<string, unknown>;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "solid",
      size = "md",
      leftIcon,
      rightIcon,
      isLoading,
      isDisabled,
      as: Comp = "button",
      className = "",
      children,
      disabled,
      whileHover,
      whileTap,
      colorScheme, // игнорируем, чтобы не улетало в DOM
      type,
      ...props
    },
    ref
  ) => {
    const isNativeButton = typeof Comp === "string" && Comp === "button";
    const resolvedType = isNativeButton ? type ?? "button" : type;
    const base =
      "inline-flex items-center justify-center font-medium rounded-md transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";
    const sizeClasses =
      size === "sm"
        ? "h-8 px-3 text-sm gap-1.5"
        : size === "lg"
        ? "h-10 px-6 text-base gap-2"
        : "h-9 px-4 text-sm gap-2";
    const variantClasses =
      variant === "solid"
        ? "bg-brand-primary text-white hover:bg-brand-primaryDark dark:bg-brand-primary dark:text-white dark:hover:bg-brand-primaryDark"
        : variant === "outline"
        ? "border border-[#1F6A5C]/20 dark:border-white/20 text-[#103E36] dark:text-white hover:bg-[#F4F3F4]/50 dark:hover:bg-white/10 dark:hover:border-white/30"
        : "text-[#103E36] dark:text-[#F4F3F4]/80 hover:bg-[#F4F3F4] dark:hover:bg-white/10";
    const cls = `${base} ${sizeClasses} ${variantClasses} ${className}`;
    return (
      <Comp
        ref={ref}
        className={cls}
        disabled={disabled || isLoading || isDisabled}
        {...(resolvedType !== undefined ? { type: resolvedType } : {})}
        {...(whileHover && { whileHover })}
        {...(whileTap && { whileTap })}
        {...props}
      >
        {isLoading ? (
          <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
        ) : (
          <>
            {leftIcon && <span className="shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="shrink-0">{rightIcon}</span>}
          </>
        )}
      </Comp>
    );
  }
);

Button.displayName = "Button";
