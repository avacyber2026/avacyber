"use client";

import { Input, InputGroup, InputRightElement, IconButton } from "@/ui";
import { HiEye, HiEyeSlash } from "react-icons/hi2";
import { useState } from "react";

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isInvalid?: boolean;
}

export default function PasswordInput({ value, onChange, isInvalid, ...rest }: PasswordInputProps) {
  const [show, setShow] = useState(false);
  const { size, className: inputClassName, ...inputRest } = rest;
  const inputSize = typeof size === "string" && ["sm", "md", "lg"].includes(size) ? size : "md";

  return (
    <InputGroup size={inputSize} className="w-full h-[52px]">
      <Input
        {...inputRest}
        size={inputSize}
        isInvalid={isInvalid}
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        className={inputClassName ? `${inputClassName} pr-12 w-full h-[52px]` : "pr-12 w-full h-[52px]"}
      />
      <InputRightElement
        width="2.5rem"
        height="100%"
        className="pointer-events-auto"
      >
        <IconButton
          aria-label={show ? "Hide password" : "Show password"}
          icon={show ? <HiEyeSlash size={18} /> : <HiEye size={18} />}
          size="sm"
          variant="ghost"
          onClick={() => setShow((s) => !s)}
          className="min-w-0 hover:!bg-transparent"
        />
      </InputRightElement>
    </InputGroup>
  );
}
