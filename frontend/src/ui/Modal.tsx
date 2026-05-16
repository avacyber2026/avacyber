"use client";

import { useEffect, useRef } from "react";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
}

export function Modal({ isOpen, onClose, children, size = "md" }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses =
    size === "sm"
      ? "max-w-sm"
      : size === "lg"
      ? "max-w-2xl"
      : size === "xl"
      ? "max-w-4xl"
      : size === "full"
      ? "max-w-[90vw] max-h-[90vh]"
      : "max-w-lg";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        ref={overlayRef}
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`relative bg-white dark:bg-[#1E2128] rounded-lg shadow-xl ${sizeClasses} w-full max-h-[90vh] overflow-auto`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </div>
  );
}

export function ModalOverlay() {
  return null;
}

export function ModalContent({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={className}>{children}</div>;
}

export function ModalHeader({
  children,
  onClose,
  className = "",
}: {
  children: React.ReactNode;
  onClose?: () => void;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center justify-between p-4 border-b border-[#1F6A5C]/20 dark:border-white/10 ${className}`}
    >
      <div className="text-lg font-semibold text-[#1C1E1C] dark:text-white">
        {children}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-[#F4F3F4] dark:hover:bg-white/10 text-[#1F6A5C]/70 hover:text-[#103E36] dark:text-[#1F6A5C]/60 dark:hover:text-white"
          aria-label="Close"
        >
          ×
        </button>
      )}
    </div>
  );
}

export function ModalBody({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`p-4 ${className}`}>{children}</div>;
}

export function ModalFooter({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center justify-end gap-2 p-4 border-t border-[#1F6A5C]/20 dark:border-white/10 ${className}`}
    >
      {children}
    </div>
  );
}

export function ModalCloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      onClick={onClose}
      className="absolute top-2 right-2 p-1 rounded cursor-pointer hover:bg-[#F4F3F4] dark:hover:bg-white/10"
      aria-label="Close"
    >
      ×
    </button>
  );
}
