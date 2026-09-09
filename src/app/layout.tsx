import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "../components/SiteHeader";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NeuroHub Engineering",
  description: "Technical insights and engineering updates from the NeuroHub team.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable}`}>
      <body style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', margin: 0, background: 'var(--background, #f1f5f9)', fontFamily: 'var(--font-inter, sans-serif)' }}>
        <SiteHeader />
        <main style={{ flex: '1 0 auto', padding: '2rem' }}>
          {children}
        </main>
      </body>
    </html>
  );
}
