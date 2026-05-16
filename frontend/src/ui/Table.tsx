"use client";

export function TableContainer({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`overflow-x-auto ${className}`}>
      {children}
    </div>
  );
}

export function Table({
  children,
  className = "",
  variant,
}: {
  children: React.ReactNode;
  className?: string;
  variant?: string;
}) {
  return (
    <table className={`min-w-full divide-y divide-[#1F6A5C]/15 dark:divide-white/20 ${className}`}>
      {children}
    </table>
  );
}

export function Thead({ children }: { children: React.ReactNode }) {
  return <thead className="bg-[#F4F3F4]/50 dark:bg-[#1E2128]/50">{children}</thead>;
}

export function Tbody({ children }: { children: React.ReactNode }) {
  return (
    <tbody className="divide-y divide-[#1F6A5C]/15 dark:divide-white/20 bg-white dark:bg-[#1E2128]">
      {children}
    </tbody>
  );
}

export function Tr({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <tr className={className}>{children}</tr>;
}

export function Th({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={`px-4 py-3 text-left text-xs font-medium text-[#1F6A5C] dark:text-[#F4F3F4]/65 uppercase tracking-wider ${className}`}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <td
      className={`px-4 py-3 text-sm text-[#103E36] dark:text-[#F4F3F4] ${className}`}
    >
      {children}
    </td>
  );
}
