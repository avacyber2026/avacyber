import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SOChub - Clarity in Security and Compliance",
  description: "SOChub — AI-Native SIEM & Security Operations Platform",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div data-admin="true">{children}</div>;
}
