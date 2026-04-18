"use client";

import { useEffect, useMemo, useState } from "react";
import { useProxyCredentials } from "@/components/features/products/ProxyCredentialsProvider";
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
  endpoint: string;
}

/**
 * Client-side file browser that fetches directory listings from the data proxy.
 * Uses proxy credentials for authenticated access, or unsigned requests for
 * anonymous access. Handles both directory and file paths.
 */
export function ProductFileBrowser({
  product,
  account_id,
  product_id,
  prefix,
  endpoint,
}: ProductFileBrowserProps) {
  const { credentials: proxyCredentials, status: proxyCredentialsStatus } =
    useProxyCredentials();
  const [listing, setListing] = useState<ListObjectsResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const isCredentialsReady = proxyCredentialsStatus !== "loading";

  const s3Client = useMemo(() => {
    if (!isCredentialsReady || !endpoint) return null;
    return new S3ReadClient({
      endpoint,
      credentials: proxyCredentials ?? undefined,
    });
  }, [isCredentialsReady, proxyCredentials, endpoint]);

  useEffect(() => {
    if (!s3Client) return;

    setLoading(true);
    setError(null);

    // List with the prefix as a directory (trailing slash).
    // If the path is a file (e.g. catalog.json), this returns an empty listing,
    // which we handle below by listing the parent directory instead.
    const s3Prefix = prefix
      ? `${product_id}/${prefix}/`
      : `${product_id}/`;

    s3Client
      .listObjects({ bucket: account_id, prefix: s3Prefix })
      .then((result) => {
        setListing(result);
      })
      .catch((e) => {
        setError(e.message ?? "Failed to load files");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [s3Client, account_id, product_id, prefix]);

  if (!isCredentialsReady || loading) {
    return <DirectoryListLoading />;
  }

  if (error) {
    return <div>Error loading files: {error}</div>;
  }

  if (!listing) return null;

  // If the listing is empty and the prefix has a file extension,
  // the user navigated to a file path. Show the parent directory instead
  // with this file highlighted (or just show the parent listing).
  const isEmpty =
    listing.objects.length === 0 && listing.directories.length === 0;
  if (isEmpty && prefix) {
    // TODO: handle file view (ObjectSummary + ObjectPreview) client-side
    // For now, this case means the server-side page rendered ProductFileBrowser
    // for a file path. The listing will be empty.
    return <DirectoryListLoading />;
  }

  // Map S3ReadClient results to ProductObject[] for DirectoryList
  const objects: ProductObject[] = [
    ...listing.objects.map((obj) => ({
      id: obj.key,
      product_id,
      path: obj.key.replace(`${product_id}/`, ""),
      size: obj.size,
      type: "file" as const,
      created_at: obj.lastModified,
      updated_at: obj.lastModified,
      checksum: obj.etag,
    })),
    ...listing.directories.map((dir) => ({
      id: dir,
      product_id,
      path: dir.replace(`${product_id}/`, ""),
      size: 0,
      type: "directory" as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      checksum: "",
      isDirectory: true,
    })),
  ];

  const objectPath = prefix || "";

  return (
    <DirectoryList
      product={product}
      objects={objects.filter(
        (obj) => obj.path.replace(/\/$/, "") !== objectPath,
      )}
      prefix={objectPath}
    />
  );
}
