"use client";

import { useEffect, useMemo, useState } from "react";
import { Box } from "@radix-ui/themes";
import { MonoText } from "@/components/core";
import { useS3Credentials } from "@/components/features/uploader/CredentialsProvider";
import {
  S3ReadClient,
  type ListObjectsResult,
} from "@/lib/services/s3-read";
import type { Product, ProductObject } from "@/types";
import { DirectoryList } from "./DirectoryList";
import DirectoryListLoading from "@/app/(app)/[account_id]/[product_id]/(product)/[[...path]]/loading";

interface ProductFileBrowserProps {
  product: Product;
  account_id: string;
  product_id: string;
  prefix: string;
}

/**
 * Client-side file browser that uses S3ReadClient to list objects.
 * Replaces the server-side storage.listObjects() call in the product page.
 */
export function ProductFileBrowser({
  product,
  account_id,
  product_id,
  prefix,
}: ProductFileBrowserProps) {
  const { proxyCredentials, proxyCredentialsStatus } = useS3Credentials();
  const [listing, setListing] = useState<ListObjectsResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Wait for credentials to resolve before creating the client
  const isCredentialsReady =
    proxyCredentialsStatus !== "loading";

  const s3Client = useMemo(() => {
    if (!isCredentialsReady) return null;
    const endpoint = process.env.NEXT_PUBLIC_S3_ENDPOINT;
    if (!endpoint) {
      return null;
    }
    return new S3ReadClient({
      endpoint,
      credentials: proxyCredentials ?? undefined,
    });
  }, [isCredentialsReady, proxyCredentials]);

  useEffect(() => {
    if (!s3Client) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    const s3Prefix = prefix
      ? `${product_id}/${prefix}${prefix.endsWith("/") ? "" : "/"}`
      : `${product_id}/`;

    s3Client
      .listObjects({
        bucket: account_id,
        prefix: s3Prefix,
        delimiter: "/",
      })
      .then((result) => {
        if (!cancelled) {
          setListing(result);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to list objects"
          );
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [s3Client, account_id, product_id, prefix]);

  if (!isCredentialsReady || loading) {
    return <DirectoryListLoading />;
  }

  if (error) {
    return (
      <Box p="4">
        <MonoText color="red">Error loading files: {error}</MonoText>
      </Box>
    );
  }

  const objects = mapToProductObjects(
    listing,
    product_id,
    prefix
  );

  // Filter out the current directory object (matching existing behavior)
  const filtered = objects.filter(
    (obj) => obj.path.replace(/\/$/, "") !== prefix
  );

  return (
    <DirectoryList product={product} objects={filtered} prefix={prefix} />
  );
}

/**
 * Convert S3ReadClient's ListObjectsResult into ProductObject[] for DirectoryList.
 */
function mapToProductObjects(
  listing: ListObjectsResult | null,
  product_id: string,
  prefix: string
): ProductObject[] {
  if (!listing) return [];

  const result: ProductObject[] = [];

  // Map S3 objects (files)
  for (const obj of listing.objects) {
    // Strip the product_id/ prefix from the key to get the path
    const path = obj.key.startsWith(`${product_id}/`)
      ? obj.key.slice(product_id.length + 1)
      : obj.key;

    result.push({
      id: obj.key,
      product_id,
      path,
      size: obj.size,
      type: "file",
      created_at: obj.lastModified,
      updated_at: obj.lastModified,
      checksum: obj.etag,
    });
  }

  // Map S3 common prefixes (directories)
  for (const dir of listing.directories) {
    const path = dir.startsWith(`${product_id}/`)
      ? dir.slice(product_id.length + 1)
      : dir;

    result.push({
      id: dir,
      product_id,
      path,
      size: 0,
      type: "directory",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      checksum: "",
      isDirectory: true,
    });
  }

  return result;
}
