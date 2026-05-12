import type { Metadata } from "next";
import { Inter, Rethink_Sans } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const rethinkSans = Rethink_Sans({ subsets: ["latin"], variable: "--font-rethink", weight: ["400", "500", "600", "700", "800"] });

export const metadata: Metadata = {
  title: "AVA cyber | Enterprise Security Operations",
  description: "Clarity in Security and Compliance — SecureConnect platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${rethinkSans.variable}`}>
      <body className="antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
