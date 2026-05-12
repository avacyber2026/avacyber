"use client";

import { forwardRef } from "react";

export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  name?: string;
  src?: string | null;
  size?: "xs" | "sm" | "md" | "lg";
  bg?: string;
  color?: string;
}

const sizeMap = { xs: "24px", sm: "32px", md: "40px", lg: "48px" };

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export const Avatar = forwardRef<HTMLSpanElement, AvatarProps>(
  (
    {
      name = "",
      src,
      size = "md",
      bg = "brand-primary",
      color = "white",
      className = "",
      ...props
    },
    ref
  ) => {
    const s = sizeMap[size];
    const bgClass =
      bg === "brand.primary" ? "bg-brand-primary" : "";
    const style: React.CSSProperties = {
      width: s,
      height: s,
      backgroundColor: bgClass ? undefined : bg,
      color,
    };
    return (
      <span
        ref={ref}
        className={`inline-flex shrink-0 items-center justify-center rounded-full overflow-hidden ${bgClass} ${className}`}
        style={style}
        {...props}
      >
        {src ? (
          <img
            src={src}
            alt={name}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-xs font-semibold" style={{ color: "inherit" }}>
            {getInitials(name)}
          </span>
        )}
      </span>
    );
  }
);

Avatar.displayName = "Avatar";
