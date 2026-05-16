import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Incidents — AVA Cyber",
  description: "Incidents — AVA Cyber",
};

export default function TicketsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
