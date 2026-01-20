import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { BottomNav } from "@/components/shared/BottomNav";
import { LiquidTransition } from "@/components/shared/LiquidTransition";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers/Providers";
import { Analytics } from "@vercel/analytics/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ClimbSet - Digital Route Setter",
  description: "Document and share your climbing routes",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          {children}
          <BottomNav />
          <LiquidTransition />
          <Toaster />
          <Analytics />
        </Providers>
      </body>
    </html>
  );
}
