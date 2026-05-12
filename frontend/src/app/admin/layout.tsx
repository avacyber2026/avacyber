import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin — AVA-CYBER",
  description: "Admin panel — AVA-CYBER",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div data-admin="true">{children}</div>;
}
