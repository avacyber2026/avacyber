import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SOChub",
  description: "SOChub — AI-Native SIEM & Security Operations Platform",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div data-admin="true">{children}</div>;
}
