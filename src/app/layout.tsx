import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "../components/SiteHeader";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://blog.neurohubcare.com"),
  title: {
    default: "NeuroHub Engineering | AI-Native Systems for Healthcare",
    template: "%s | NeuroHub Engineering",
  },
  description:
    "Engineering deep-dives into building the first AI-native operating system for neurodiversity care. Architecture, LLM-as-a-judge, multi-agent systems, and serverless reliability.",
  keywords: [
    "NeuroHub",
    "AI-Native Software",
    "Autonomous Agents",
    "LLM as a Judge",
    "Playwright Testing",
    "California Regional Centers",
    "Self-Determination Program",
    "Next.js App Router",
    "AWS Amplify",
    "DynamoDB Architecture",
    "Orama Vector Search",
    "TypeScript Compliance Engine",
  ],
  authors: [{ name: "NeuroHub Engineering Team", url: "https://blog.neurohubcare.com" }],
  creator: "NeuroHub",
  publisher: "NeuroHub",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://blog.neurohubcare.com",
    siteName: "NeuroHub Engineering",
    title: "NeuroHub Engineering | AI-Native Systems for Healthcare",
    description:
      "Deep-dives into building the first AI-native operating system for neurodiversity care. Scaling autonomous agents, visual testing, and compliance engines.",
  },
  twitter: {
    card: "summary_large_image",
    title: "NeuroHub Engineering",
    description: "Deep-dives into building the first AI-native operating system for neurodiversity care.",
  },
  alternates: {
    canonical: "https://blog.neurohubcare.com",
    types: {
      "application/rss+xml": "https://blog.neurohubcare.com/rss.xml",
    },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable}`}>
      <head>
        <link rel="alternate" type="application/rss+xml" title="NeuroHub Engineering RSS Feed" href="/rss.xml" />
      </head>
      <body style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', margin: 0, background: 'var(--background, #f1f5f9)', fontFamily: 'var(--font-inter, sans-serif)' }}>
        <SiteHeader />
        <main style={{ flex: '1 0 auto', padding: '2rem' }}>
          {children}
        </main>
      </body>
    </html>
  );
}
