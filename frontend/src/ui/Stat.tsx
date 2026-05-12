"use client";

export function Stat({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}

export function StatLabel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <dt className={`text-sm font-medium text-gray-500 dark:text-gray-400 ${className}`}>
      {children}
    </dt>
  );
}

export function StatNumber({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <dd className={`text-2xl font-semibold text-gray-900 dark:text-white ${className}`}>
      {children}
    </dd>
  );
}

export function StatHelpText({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <dd className={`text-sm text-gray-500 dark:text-gray-400 mt-1 ${className}`}>
      {children}
    </dd>
  );
}
