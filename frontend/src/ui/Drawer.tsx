"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  placement?: "left" | "right" | "top" | "bottom";
  children: React.ReactNode;
  finalFocusRef?: React.RefObject<HTMLElement>;
}

const overlayVariants = {
  open: { opacity: 1 },
  closed: { opacity: 0 },
};

const drawerVariants = {
  left: {
    open: { x: 0 },
    closed: { x: "-100%" },
  },
  right: {
    open: { x: 0 },
    closed: { x: "100%" },
  },
  top: {
    open: { y: 0 },
    closed: { y: "-100%" },
  },
  bottom: {
    open: { y: 0 },
    closed: { y: "100%" },
  },
};

const placementClasses = {
  left: "left-0 top-0 bottom-0",
  right: "right-0 top-0 bottom-0",
  top: "top-0 left-0 right-0",
  bottom: "bottom-0 left-0 right-0",
};

const springTransition = {
  type: "spring",
  stiffness: 260,
  damping: 32,
};

export function Drawer({
  isOpen,
  onClose,
  placement = "left",
  children,
}: DrawerProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  const handleExitComplete = () => {
    document.body.style.overflow = "";
  };

  const variants = drawerVariants[placement];

  return (
    <AnimatePresence onExitComplete={handleExitComplete}>
      {isOpen && (
        <>
          <motion.div
            key="overlay"
            className="fixed inset-0 bg-black/50 z-40 cursor-pointer"
            initial="closed"
            animate="open"
            exit="closed"
            variants={overlayVariants}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            key="drawer"
            className={`fixed z-50 ${placementClasses[placement]}`}
            initial="closed"
            animate="open"
            exit="closed"
            variants={variants}
            transition={springTransition}
            role="dialog"
            aria-modal="true"
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export function DrawerOverlay() {
  return null;
}

export function DrawerContent({
  children,
  className = "",
  maxW,
  bg,
  color,
}: {
  children: React.ReactNode;
  className?: string;
  maxW?: string;
  bg?: string;
  color?: string;
}) {
  const bgClass = bg === "sidebar.bg" ? "bg-[#F4F3F4] dark:bg-[#131C18]" : "bg-white dark:bg-[#1B2620]";
  const colorClass = color === "sidebar.textPrimary" ? "text-[#103E36] dark:text-white" : "";
  return (
    <div
      className={`h-full flex flex-col overflow-y-auto ${bgClass} ${colorClass} ${className}`}
      style={{ maxWidth: maxW }}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
}

export function DrawerHeader({
  children,
  className = "",
  borderBottomWidth,
  borderColor,
  py,
}: {
  children: React.ReactNode;
  className?: string;
  borderBottomWidth?: string;
  borderColor?: string;
  py?: number;
}) {
  return (
    <div
      className={`border-b border-[#1F6A5C]/20 dark:border-white/10 ${className}`}
      style={{
        borderBottomWidth: borderBottomWidth ?? "1px",
        paddingTop: py !== undefined ? `${py * 0.25}rem` : undefined,
        paddingBottom: py !== undefined ? `${py * 0.25}rem` : undefined,
      }}
    >
      {children}
    </div>
  );
}

export function DrawerBody({
  children,
  className = "",
  p,
  display,
  flexDir,
  overflowY,
}: {
  children: React.ReactNode;
  className?: string;
  p?: number;
  display?: string;
  flexDir?: string;
  overflowY?: string;
}) {
  return (
    <div
      className={`flex-1 ${className}`}
      style={{
        padding: p !== undefined ? `${p * 0.25}rem` : undefined,
        display: display as React.CSSProperties["display"],
        flexDirection: flexDir as React.CSSProperties["flexDirection"],
        overflowY: overflowY as React.CSSProperties["overflowY"],
      }}
    >
      {children}
    </div>
  );
}
