"use client";

import { forwardRef } from "react";

export interface SimpleGridProps extends React.HTMLAttributes<HTMLDivElement> {
  columns?: number | number[];
  minChildWidth?: string;
  spacing?: number;
}

export const SimpleGrid = forwardRef<HTMLDivElement, SimpleGridProps>(
  (
    {
      columns = 1,
      minChildWidth,
      spacing = 4,
      className = "",
      style,
      ...props
    },
    ref
  ) => {
    const cols =
      typeof columns === "number"
        ? columns
        : Array.isArray(columns)
        ? columns[0]
        : 1;
    const gap = spacing * 0.25;
    const gridStyle: React.CSSProperties = {
      display: "grid",
      gridTemplateColumns: minChildWidth
        ? `repeat(auto-fill, minmax(${minChildWidth}, 1fr))`
        : `repeat(${cols}, 1fr)`,
      gap: `${gap}rem`,
      ...style,
    };
    return (
      <div ref={ref} className={className} style={gridStyle} {...props} />
    );
  }
);

SimpleGrid.displayName = "SimpleGrid";
