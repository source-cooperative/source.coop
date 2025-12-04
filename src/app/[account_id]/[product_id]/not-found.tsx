import { NotFoundPage } from "@/components/core";
import { accountUrl } from "@/lib/urls";
import { Text } from "@radix-ui/themes";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Product Not Found | Source Cooperative",
  description: "The requested product could not be found.",
  openGraph: {
    title: "Product Not Found | Source Cooperative",
    description: "The requested product could not be found.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Product Not Found | Source Cooperative",
    description: "The requested product could not be found.",
  },
};

interface NotFoundProps {
  params: Promise<{
    account_id: string;
    product_id: string;
  }>;
}

export default async function NotFound({ params }: NotFoundProps) {
  const { account_id, product_id } = await params;

  if (account_id && product_id) {
    return (
      <NotFoundPage
        title="Product Not Found"
        description={
          <Text>
            The product{" "}
            <strong>
              <code>{product_id}</code>
            </strong>{" "}
            was not found in the account{" "}
            <strong>
              <code>{account_id}</code>
            </strong>
            .
          </Text>
        }
        actionText={
          <>
            Look for other products by{" "}
            <strong>
              <code>{account_id}</code>
            </strong>
          </>
        }
        actionHref={accountUrl(account_id)}
      />
    );
  }
  return <NotFoundPage title="Not Found" />;
}
