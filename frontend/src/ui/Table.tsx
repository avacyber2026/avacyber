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
    <table className={`min-w-full divide-y divide-gray-200 dark:divide-white/20 ${className}`}>
      {children}
    </table>
  );
}

export function Thead({ children }: { children: React.ReactNode }) {
  return <thead className="bg-gray-50 dark:bg-gray-800/50">{children}</thead>;
}

export function Tbody({ children }: { children: React.ReactNode }) {
  return (
    <tbody className="divide-y divide-gray-200 dark:divide-white/20 bg-white dark:bg-[#1B2620]">
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
      className={`px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider ${className}`}
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
      className={`px-4 py-3 text-sm text-gray-800 dark:text-gray-100 ${className}`}
    >
      {children}
    </td>
  );
}
