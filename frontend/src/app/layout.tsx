import type { Metadata, Viewport } from "next";
import { Rethink_Sans } from "next/font/google";
import "@/styles/globals.css";
import { Providers } from "./providers";
import { Toaster } from "react-hot-toast";

const rethinkSans = Rethink_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-rethink",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: "SOChub - Clarity in Security and Compliance",
  description: "SOChub - Clarity in Security and Compliance",
  icons: {
    icon: "/ava-logo-v2.png",
    apple: "/ava-logo-v2.png",
    shortcut: "/ava-logo-v2.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={rethinkSans.variable} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var m=localStorage.getItem('chakra-ui-color-mode');document.documentElement.classList.toggle('dark',m==='dark');try{var c=localStorage.getItem('app-sidebar-collapsed');document.documentElement.style.setProperty('--app-sidebar-width',c==='1'?'60px':'240px');}catch(e){}})();`,
          }}
        />
      </head>
      <body className={`${rethinkSans.className} bg-[#D8E8E3] dark:bg-[#1C1E1C] text-[#1C1E1C] dark:text-[#F4F3F4]`}>
        <Providers>{children}</Providers>
        <Toaster
          position="top-center"
          containerStyle={{ top: 60 }}
          toastOptions={{
            duration: 4000,
            style: {
              background: "#1E2128",
              color: "#F4F3F4",
              fontFamily: "var(--font-rethink), system-ui, sans-serif",
            },
          }}
        />
      </body>
    </html>
  );
}
