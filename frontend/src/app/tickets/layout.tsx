import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Incidents — AVA cyber",
  description: "Incidents — AVA cyber",
};

export default function TicketsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
