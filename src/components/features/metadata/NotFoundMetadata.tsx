import type { Metadata } from "next";
import { CONFIG, getBaseUrl } from "@/lib";

interface NotFoundMetadataProps {
  title?: string;
  description?: string;
  url?: string;
}

export async function generateNotFoundMetadata({
  title = "Page Not Found",
  description = "The page you are looking for does not exist.",
  url,
}: NotFoundMetadataProps = {}): Promise<Metadata> {
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
