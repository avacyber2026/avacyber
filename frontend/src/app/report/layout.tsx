import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Report — AVA cyber",
  description: "Reported activity — AVA cyber",
};

export default function ReportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
