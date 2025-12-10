import type { Metadata } from "next";
import type { Account } from "@/types";
import { CONFIG } from "@/lib";
import { getBaseUrl } from "@/lib/baseUrl";
import { AccountType } from "@/types/account";

interface AccountMetadataProps {
  account: Account;
}

export async function generateAccountMetadata({
  account,
}: AccountMetadataProps): Promise<Metadata> {
  const baseUrl = await getBaseUrl();

  const accountType =
    account.type === AccountType.INDIVIDUAL ? "Individual" : "Organization";
  const title = `${account.name} · ${accountType} · Source Cooperative`;
  const description =
    account.metadata_public.bio ||
    `${account.name} is ${
      account.type === AccountType.INDIVIDUAL ? "an" : "an"
    } ${accountType.toLowerCase()} on Source Cooperative`;
  const url = `${baseUrl}/${account.account_id}`;

  // Generate OG image URL
  const ogImageUrl = new URL("/api/og", baseUrl);
  ogImageUrl.searchParams.set("type", "account");
  ogImageUrl.searchParams.set("account_id", account.account_id);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "profile",
      url,
      images: [
        {
          url: ogImageUrl.toString(),
          width: 1200,
          height: 390,
          alt: title,
        },
      ],
      siteName: "Source Cooperative",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl.toString()],
    },
    other: {
      "google-site-verification": CONFIG.google.siteVerification,
    },
    // Schema.org metadata as JSON-LD
    alternates: {
      canonical: url,
    },
  };
}
