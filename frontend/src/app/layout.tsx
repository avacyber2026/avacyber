import type { Metadata, Viewport } from "next";
import "@/styles/globals.css";
import { Providers } from "./providers";
import { Toaster } from "react-hot-toast";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: "AVA cyber",
  description: "AVA cyber — security operations platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var m=localStorage.getItem('chakra-ui-color-mode');document.documentElement.classList.toggle('dark',m==='dark');try{var c=localStorage.getItem('app-sidebar-collapsed');document.documentElement.style.setProperty('--app-sidebar-width',c==='1'?'60px':'240px');}catch(e){}})();`,
          }}
        />
      </head>
      <body className="bg-[#F4F3F4] dark:bg-[#131C18] text-[#103E36] dark:text-[#F4F3F4]">
        <Providers>{children}</Providers>
        <Toaster
          position="top-center"
          containerStyle={{ top: 60 }}
          toastOptions={{
            duration: 4000,
            style: {
              background: "#1B2620",
              color: "#f3f4f6",
            },
          }}
        />
      </body>
    </html>
  );
}
