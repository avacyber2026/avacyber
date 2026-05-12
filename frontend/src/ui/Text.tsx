import { forwardRef } from "react";

export interface TextProps extends React.HTMLAttributes<HTMLParagraphElement> {
  as?: React.ElementType;
  fontSize?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  fontWeight?: number | string;
  noOfLines?: number;
  letterSpacing?: string;
}

const fontSizeMap: Record<string, string> = {
  xs: "0.75rem",
  sm: "0.875rem",
  md: "1rem",
  lg: "1.125rem",
  xl: "1.25rem",
  "2xl": "1.5rem",
};

export const Text = forwardRef<HTMLParagraphElement, TextProps>(
  (
    {
      as: Comp = "p",
      fontSize,
      fontWeight,
      noOfLines,
      letterSpacing,
      className = "",
      style,
      ...props
    },
    ref
  ) => {
    const classes = [
      fontSize === "xs" && "text-xs",
      fontSize === "sm" && "text-sm",
      fontSize === "md" && "text-base",
      fontSize === "lg" && "text-lg",
      fontSize === "xl" && "text-xl",
      fontSize === "2xl" && "text-2xl",
      fontWeight === 500 && "font-medium",
      fontWeight === 600 && "font-semibold",
      fontWeight === 700 && "font-bold",
      noOfLines && "line-clamp-" + noOfLines,
      letterSpacing === "tight" && "tracking-tight",
      className,
    ]
      .filter(Boolean)
      .join(" ");
    const inlineStyle: React.CSSProperties = {
      ...(typeof fontSize === "string" && fontSizeMap[fontSize]
        ? { fontSize: fontSizeMap[fontSize] }
        : {}),
      ...(typeof fontWeight === "number" ? { fontWeight } : {}),
      ...(noOfLines
        ? {
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "-webkit-box",
            WebkitLineClamp: noOfLines,
            WebkitBoxOrient: "vertical" as const,
          }
        : {}),
      ...style,
    };
    return <Comp ref={ref} className={classes} style={inlineStyle} {...props} />;
  }
);

Text.displayName = "Text";
