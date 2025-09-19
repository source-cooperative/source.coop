"use client";

import { NotFoundPage } from "@/components/core";
import { accountUrl } from "@/lib/urls";
import { usePathname } from "next/navigation";
import { Text } from "@radix-ui/themes";

export default function NotFound() {
  const pathname = usePathname();
  const [account_id, product_id] = pathname.split("/").slice(1, 3);
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
