"use client";

import React, { createContext, useContext, useState, useRef, useEffect } from "react";

interface MenuContextValue {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  onToggle: () => void;
  buttonRef: React.RefObject<HTMLButtonElement | null>;
}

const MenuContext = createContext<MenuContextValue | null>(null);

export interface MenuProps {
  children: React.ReactNode;
}

export function Menu({ children }: MenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const value: MenuContextValue = {
    isOpen,
    onOpen: () => setIsOpen(true),
    onClose: () => setIsOpen(false),
    onToggle: () => setIsOpen((p) => !p),
    buttonRef,
  };

  return (
    <MenuContext.Provider value={value}>
      <div ref={containerRef} className="relative inline-flex items-center">
        {children}
      </div>
    </MenuContext.Provider>
  );
}

export interface MenuButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  as?: React.ElementType;
  children: React.ReactNode;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  variant?: "solid" | "outline" | "ghost";
  /** No default chrome (e.g. sidebar / glass panels) */
  bare?: boolean;
}

interface MenuItemProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export function MenuButton({
  as: Comp = "button",
  children,
  leftIcon,
  rightIcon,
  size: _size,
  variant: _variant,
  bare = false,
  className = "",
  onClick,
  type,
  ...props
}: MenuButtonProps) {
  const ctx = useContext(MenuContext);
  if (!ctx) throw new Error("MenuButton must be inside Menu");

  const resolvedType =
    typeof Comp === "string" && Comp === "button" ? type ?? "button" : type;

  const base = bare
    ? "inline-flex items-center gap-2 text-sm cursor-pointer"
    : "inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-md cursor-pointer bg-white dark:bg-[#192420] border border-[#1F6A5C]/20 dark:border-white/20 text-[#103E36] dark:text-white hover:bg-[#F4F3F4]/50 dark:hover:bg-white/10";

  return (
    <Comp
      ref={ctx.buttonRef as React.Ref<HTMLButtonElement>}
      type={resolvedType as React.ButtonHTMLAttributes<HTMLButtonElement>["type"]}
      onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
        ctx.onToggle();
        onClick?.(e as React.MouseEvent<HTMLButtonElement>);
      }}
      className={`${base} ${className}`.trim()}
      {...props}
    >
      {leftIcon && <span className="shrink-0">{leftIcon}</span>}
      {children}
      {rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </Comp>
  );
}

function isMenuItemElement(child: React.ReactNode): child is React.ReactElement<MenuItemProps> {
  if (!React.isValidElement(child)) return false;
  if (child.type === MenuItem) return true;
  const t = child.type as { displayName?: string };
  return t?.displayName === "MenuItem";
}

export function MenuList({
  children,
  placement = "bottom",
  align = "start",
  className = "",
}: {
  children: React.ReactNode;
  placement?: "bottom" | "top";
  align?: "start" | "end";
  className?: string;
}) {
  const ctx = useContext(MenuContext);
  if (!ctx) throw new Error("MenuList must be inside Menu");

  if (!ctx.isOpen) return null;

  const posClass =
    placement === "top" ? "bottom-full mb-1" : "top-full mt-1";
  const alignClass = align === "end" ? "right-0 left-auto" : "left-0";

  return (
    <div
      className={`absolute z-[200] min-w-[160px] py-1 rounded-md shadow-lg bg-white dark:bg-[#192420] border border-[#1F6A5C]/20 dark:border-white/20 ${posClass} ${alignClass} ${className}`.trim()}
      role="menu"
    >
      {React.Children.map(children, (child) => {
        if (isMenuItemElement(child)) {
          const origOnClick = child.props.onClick;
          return React.cloneElement(child, {
            onClick: () => {
              origOnClick?.();
              ctx.onClose();
            },
          });
        }
        return child;
      })}
    </div>
  );
}

export function MenuItem({ children, onClick, className = "" }: MenuItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`w-full text-left px-3 py-2 text-sm cursor-pointer text-[#103E36] dark:text-white hover:bg-[#F4F3F4] dark:hover:bg-white/10 ${className}`.trim()}
    >
      {children}
    </button>
  );
}

MenuItem.displayName = "MenuItem";
