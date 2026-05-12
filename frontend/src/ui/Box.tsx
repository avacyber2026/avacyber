import { forwardRef } from "react";

export interface BoxProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: React.ElementType;
  initial?: Record<string, unknown>;
  animate?: Record<string, unknown>;
  transition?: Record<string, unknown>;
}

export const Box = forwardRef<HTMLDivElement, BoxProps>(
  ({ as: Comp = "div", className = "", initial, animate, transition, ...props }, ref) => {
    return (
      <Comp
        ref={ref}
        className={className}
        {...(initial && { initial })}
        {...(animate && { animate })}
        {...(transition && { transition })}
        {...props}
      />
    );
  }
);

Box.displayName = "Box";
