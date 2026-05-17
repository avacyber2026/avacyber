import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SOChub - Clarity in Security and Compliance",
  description: "SOChub — AI-Native SIEM & Security Operations Platform",
};

export default function TicketsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
