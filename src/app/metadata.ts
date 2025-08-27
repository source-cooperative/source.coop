import type { Metadata } from 'next';
import { CONFIG } from "@/lib";

export const metadata: Metadata = {
  title: {
    default: "Source Cooperative",
    template: "%s | Source Cooperative",
  },
  description: "A data publishing utility for the web.",
  openGraph: {
    title: "Source Cooperative",
    description: "A data publishing utility for the web.",
    url: "https://source.coop",
    siteName: "Source Cooperative",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    title: "Source Cooperative",
    card: "summary_large_image",
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/icon.svg",
    apple: "/apple-touch-icon.png",
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
  verification: {
    google: CONFIG.google.siteVerification,
  },
}; 