import { LOGGER } from "@/lib";
import { getStorageClient } from "@/lib/clients/storage";
import { readProxyCredentials } from "@/lib/services/proxy-credentials-read";
import { SectionHeader } from "@/components/core/SectionHeader";
import { MarkdownViewer } from "@/components/features/markdown";
import { Card } from "@radix-ui/themes";

import { getAuthorizedProduct } from "../data";

interface ProductPathComponentProps {
  account_id: string;
  product_id: string;
  path?: string[];
}

interface PageProps {
  params: Promise<ProductPathComponentProps>;
}

export default async function ProductPathPage({ params }: PageProps) {
  const { account_id, product_id, path = [] } = await params;

  // Enforce read authorization and resolve visibility through the same gate the
  // main page slot uses (notFound() for unauthorized viewers).
  const product = await getAuthorizedProduct(account_id, product_id);
  const creds = await readProxyCredentials();

  // Mirror the main slot's gate decision: for a restricted product with no fresh
  // credentials, the page renders ProxyCredentialsGate and mints in an action.
  // Skip the storage fetch here so README content never lands in the SSR HTML
  // while the gate is still showing — it renders after the post-mint refresh.
  if (!creds && product.visibility === "restricted") {
    return null;
  }

  const object_path = [...path, "README.md"].join("/");
  const lookupDetails = {
    account_id,
    product_id,
    object_path,
  };

  let readme: string | undefined;
  try {
    const s3 = await getStorageClient(creds);
    await s3.headObject(lookupDetails);
    const result = await s3.getObject(lookupDetails);
    readme =
      result.data instanceof Buffer ? result.data.toString("utf-8") : undefined;
  } catch (error) {
    LOGGER.debug("Error fetching README", {
      operation: "ProductPathPage",
      context: "README fetch",
      metadata: { ...lookupDetails, error: (error as Error).toString() },
    });
    return null;
  }
  return (
    <Card mt="4">
      <SectionHeader title="README" />
      <MarkdownViewer content={readme!} />
    </Card>
  );
}
