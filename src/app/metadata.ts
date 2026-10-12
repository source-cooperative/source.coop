import type { Metadata } from 'next';
import { getTranslations } from "next-intl/server";
import { CONFIG } from "@/lib";

/**
 * The site description follows the reader's locale; the OpenGraph and Twitter
 * cards stay in English, since crawlers fetch them without a language.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("SiteMetadata");
  return { ...metadata, description: t("description") };
}

export const metadata: Metadata = {
  title: {
    default: "Source Cooperative",
    template: "%s | Source Cooperative",
  },
  description: "A data publishing utility for the open web.",
  openGraph: {
    title: "Source Cooperative",
    description: "A data publishing utility for the open web.",
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
    icon: "/favicon/favicon.ico",
    shortcut: "/favicon/favicon-16x16.png",
    apple: "/favicon/apple-touch-icon.png",
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