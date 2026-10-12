import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CONFIG } from "@/lib";
import { getBaseUrl } from "@/lib/baseUrl";

interface NotFoundMetadataProps {
  title?: string;
  description?: string;
  url?: string;
}

export async function generateNotFoundMetadata({
  title,
  description,
  url,
}: NotFoundMetadataProps = {}): Promise<Metadata> {
  const t = await getTranslations("NotFoundMetadata");
  title ??= t("title");
  description ??= t("description");
  const fullTitle = `${title} · Source Cooperative`;
  const baseUrl = await getBaseUrl();
  const canonicalUrl = url ? `${baseUrl}${url}` : undefined;

  return {
    title: fullTitle,
    description,
    openGraph: {
      title: fullTitle,
      description,
      type: "website",
      url: canonicalUrl,
      siteName: "Source Cooperative",
    },
    twitter: {
      card: "summary",
      title: fullTitle,
      description,
    },
    robots: {
      index: false,
      follow: true,
    },
    other: {
      "google-site-verification": CONFIG.google.siteVerification,
    },
    ...(canonicalUrl && {
      alternates: {
        canonical: canonicalUrl,
      },
    }),
  };
}
