import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Report — AVA Cyber",
  description: "Reported activity — AVA Cyber",
};

export default function ReportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
