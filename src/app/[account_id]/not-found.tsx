"use client";
import { NotFoundPage } from "@/components/core";
import { Box, Text } from "@radix-ui/themes";
import { usePathname } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Account Not Found | Source Cooperative",
  description: "The requested account could not be found.",
  openGraph: {
    title: "Account Not Found | Source Cooperative",
    description: "The requested account could not be found.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Account Not Found | Source Cooperative",
    description: "The requested account could not be found.",
  },
};

export default function AccountNotFound() {
  const pathname = usePathname();
  const [account_id] = pathname.split("/").slice(1, 2);
  return (
    <NotFoundPage
      title="Account Not Found"
      description={
        account_id ? (
          <Box>
            <Text as="p">
              The account <strong>{account_id}</strong> could not be found.
            </Text>
            <Text as="p">
              If you just created this account, please try refreshing the page.
            </Text>
          </Box>
        ) : (
          "The requested account could not be found."
        )
      }
    />
  );
}
