"use client";

export function Stat({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}

export function StatLabel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <dt className={`text-sm font-medium text-[#1C1E1C]/70 dark:text-[#F4F3F4]/55 dark:text-[#F4F3F4]/45 ${className}`}>
      {children}
    </dt>
  );
}

export function StatNumber({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <dd className={`text-2xl font-semibold text-[#1C1E1C] dark:text-white ${className}`}>
      {children}
    </dd>
  );
}

export function StatHelpText({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <dd className={`text-sm text-[#1C1E1C]/70 dark:text-[#F4F3F4]/55 dark:text-[#F4F3F4]/45 mt-1 ${className}`}>
      {children}
    </dd>
  );
}
