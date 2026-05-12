import { forwardRef } from "react";

export interface StackProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: React.ElementType;
  direction?: "row" | "column";
  spacing?: number;
  align?: string;
  justify?: string;
  initial?: Record<string, unknown>;
  animate?: Record<string, unknown>;
  transition?: Record<string, unknown>;
}

const spacingMap: Record<number, string> = {
  0: "0",
  1: "0.25rem",
  2: "0.5rem",
  3: "0.75rem",
  4: "1rem",
  5: "1.25rem",
  6: "1.5rem",
};

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
  "space-between": "justify-between",
};

export const Stack = forwardRef<HTMLDivElement, StackProps>(
  (
    {
      as: Comp = "div",
      direction = "column",
      spacing = 2,
      align,
      justify,
      className = "",
      style,
      children,
      initial,
      animate,
      transition,
      ...props
    },
    ref
  ) => {
    const gap = spacingMap[spacing] ?? `${spacing * 0.25}rem`;
    const alignCls = align ? alignMap[align] ?? "" : "";
    const justifyCls = justify ? justifyMap[justify] ?? "" : "";
    return (
      <Comp
        ref={ref}
        className={`flex ${direction === "column" ? "flex-col" : "flex-row"} ${alignCls} ${justifyCls} ${className}`}
        style={{ gap, ...style }}
        {...(initial && { initial })}
        {...(animate && { animate })}
        {...(transition && { transition })}
        {...props}
      >
        {children}
      </Comp>
    );
  }
);

Stack.displayName = "Stack";

export const VStack = forwardRef<HTMLDivElement, Omit<StackProps, "direction">>(
  (props, ref) => <Stack ref={ref} direction="column" {...props} />
);
VStack.displayName = "VStack";

export const HStack = forwardRef<HTMLDivElement, Omit<StackProps, "direction">>(
  (props, ref) => <Stack ref={ref} direction="row" {...props} />
);
HStack.displayName = "HStack";
