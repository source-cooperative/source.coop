import { NotFoundPage } from "@/components/core";
import { Box, Text } from "@radix-ui/themes";
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

interface NotFoundProps {
  params: Promise<{ account_id: string }>;
}

export default async function AccountNotFound({ params }: NotFoundProps) {
  const { account_id } = await params;
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
