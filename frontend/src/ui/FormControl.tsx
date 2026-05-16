"use client";

import { forwardRef } from "react";

export interface FormControlProps extends React.HTMLAttributes<HTMLDivElement> {
  isInvalid?: boolean;
  isRequired?: boolean;
  isDisabled?: boolean;
}

export const FormControl = forwardRef<HTMLDivElement, FormControlProps>(
  ({ isInvalid, isRequired, isDisabled, className = "", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`${isDisabled ? "opacity-60 pointer-events-none" : ""} ${className}`}
        data-invalid={isInvalid}
        data-required={isRequired}
        {...props}
      />
    );
  }
);

FormControl.displayName = "FormControl";

export const FormLabel = forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement> & {
    isRequired?: boolean;
    fontSize?: "xs" | "sm" | "md" | "lg";
  }
>(({ isRequired, children, className = "", fontSize, ...props }, ref) => {
  const sizeCls = fontSize === "xs" ? "text-xs" : fontSize === "sm" ? "text-sm" : fontSize === "lg" ? "text-lg" : "text-sm";
  return (
    <label
      ref={ref}
      className={`block ${sizeCls} font-medium text-[#103E36] dark:text-[#F4F3F4]/65 mb-1 ${className}`}
      {...props}
    >
      {children}
      {isRequired && <span className="text-red-500 ml-1">*</span>}
    </label>
  );
});

FormLabel.displayName = "FormLabel";
