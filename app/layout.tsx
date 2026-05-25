import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import AuthProvider from "@/components/AuthProvider";
import ThemeInitializer from "@/components/ThemeInitializer";
import { QueryProvider } from "@/components/QueryProvider";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bill-dale POS",
  description: "Modern Offline-First POS System",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased dark`}
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeInitializer />
        <QueryProvider>
          <AuthProvider>{children}</AuthProvider>
        </QueryProvider>
        <Toaster 
          theme="dark" 
          position="bottom-right" 
          richColors 
          closeButton 
          expand={true}
          visibleToasts={6}
          toastOptions={{
            style: { padding: '12px', fontSize: '13px' }
          }}
        />
        <Analytics />
      </body>
    </html>
  );
}
