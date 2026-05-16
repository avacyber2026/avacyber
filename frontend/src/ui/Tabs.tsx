"use client";

import React, { useState, createContext, useContext } from "react";

interface TabsContextValue {
  index: number;
  setIndex: (i: number) => void;
  variant?: string;
}

const TabsContext = createContext<TabsContextValue | null>(null);

export interface TabsProps {
  children: React.ReactNode;
  defaultIndex?: number;
  variant?: "enclosed" | "line" | "unstyled";
  onChange?: (index: number) => void;
}

export function Tabs({
  children,
  defaultIndex = 0,
  variant = "enclosed",
  onChange,
}: TabsProps) {
  const [index, setIndex] = useState(defaultIndex);

  const handleSetIndex = (i: number) => {
    setIndex(i);
    onChange?.(i);
  };

  return (
    <TabsContext.Provider
      value={{ index, setIndex: handleSetIndex, variant }}
    >
      <div className="w-full">{children}</div>
    </TabsContext.Provider>
  );
}

interface TabListProps {
  children: React.ReactNode;
  className?: string;
  borderColor?: string;
}

export function TabList({
  children,
  className = "",
  borderColor,
}: TabListProps) {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("TabList must be inside Tabs");

  const borderCls =
    borderColor === "gray.200" || !borderColor
      ? "border-gray-200 dark:border-white/20"
      : "";

  return (
    <div
      className={`flex border-b ${borderCls} ${className}`}
      role="tablist"
    >
      {React.Children.map(children, (child, i) => {
        if (React.isValidElement(child) && child.type === Tab) {
      return React.cloneElement(child as React.ReactElement<TabProps>, {
        index: i,
        className: (child.props as TabProps).className,
      });
        }
        return child;
      })}
    </div>
  );
}

interface TabProps {
  children: React.ReactNode;
  index?: number;
  className?: string;
}

export function Tab({ children, index = 0, className = "" }: TabProps) {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("Tab must be inside Tabs");

  const isSelected = ctx.index === index;
  const base =
    "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors cursor-pointer";
  const selected =
    "text-brand-primary dark:text-white border-brand-primary dark:border-transparent bg-white dark:bg-[#1B2620]";
  const unselected =
    "text-gray-600 dark:text-gray-300 border-transparent hover:text-gray-800 dark:hover:text-white";

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isSelected}
      onClick={() => ctx.setIndex(index)}
      className={`${base} ${isSelected ? selected : unselected} ${className}`}
    >
      {children}
    </button>
  );
}

export function TabPanels({ children }: { children: React.ReactNode }) {
  return <div className="mt-2">{children}</div>;
}

export function TabPanel({
  children,
  index = 0,
}: {
  children: React.ReactNode;
  index?: number;
}) {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("TabPanel must be inside Tabs");

  if (ctx.index !== index) return null;
  return (
    <div role="tabpanel" className="p-2">
      {children}
    </div>
  );
}
