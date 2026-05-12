import { forwardRef } from "react";

export interface FlexProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: React.ElementType;
  direction?: "row" | "column" | "row-reverse" | "column-reverse";
  align?: string;
  justify?: string;
  wrap?: "wrap" | "nowrap" | "wrap-reverse";
  gap?: string | number;
}

const gapMap: Record<string, string> = {
  1: "0.25rem",
  2: "0.5rem",
  3: "0.75rem",
  4: "1rem",
  5: "1.25rem",
  6: "1.5rem",
};

export const Flex = forwardRef<HTMLDivElement, FlexProps>(
  (
    {
      as: Comp = "div",
      direction = "row",
      align,
      justify,
      wrap,
      gap,
      className = "",
      style,
      ...props
    },
    ref
  ) => {
    const alignMap: Record<string, string> = {
      start: "items-start",
      center: "items-center",
      end: "items-end",
      stretch: "items-stretch",
    };
    const justifyMap: Record<string, string> = {
      start: "justify-start",
      center: "justify-center",
      end: "justify-end",
      between: "justify-between",
      around: "justify-around",
    };
    const classes = [
      "flex",
      direction === "column" && "flex-col",
      direction === "row-reverse" && "flex-row-reverse",
      direction === "column-reverse" && "flex-col-reverse",
      align && (alignMap[align] ?? ""),
      justify && (justifyMap[justify] ?? ""),
      wrap === "wrap" && "flex-wrap",
      className,
    ]
      .filter(Boolean)
      .join(" ");
    const gapStyle =
      typeof gap === "number" && gapMap[String(gap)]
        ? { gap: gapMap[String(gap)] }
        : typeof gap === "string"
        ? { gap }
        : undefined;
    return (
      <Comp
        ref={ref}
        className={classes}
        style={{ ...gapStyle, ...style }}
        {...props}
      />
    );
  }
);

Flex.displayName = "Flex";
