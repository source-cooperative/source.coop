"use client";

import { DataList, Flex, IconButton, Tooltip } from "@radix-ui/themes";
import { CopyIcon, CheckIcon } from "@radix-ui/react-icons";
import type {
  DataConnection,
  Product,
  ProductMirror,
  ProductObject,
} from "@/types";
import { DateText } from "@/components/display";
import { ChecksumVerifier } from "../ChecksumVerifier";
import { formatFileSize } from "./utils";
import { useState } from "react";
import { DataListItem } from "./DataListItem";

interface ObjectSummaryProps {
  product: Product;
  objectInfo: ProductObject;
  connectionDetails?: {
    primaryMirror: ProductMirror;
    dataConnection: DataConnection;
  };
}

export function ObjectSummary({
  product,
  objectInfo,
  connectionDetails,
}: ObjectSummaryProps) {
  const details = connectionDetails?.dataConnection.details;
  const prefix = connectionDetails?.primaryMirror.prefix;
  const cloudUri =
    details?.provider === "az"
      ? `https://${details.account_name}.blob.core.windows.net/${details.container_name}/${prefix}${objectInfo.path}`
      : details?.provider === "s3"
      ? `s3://${details.bucket}/${prefix}${objectInfo.path}`
      : undefined;

  const [copiedField, setCopiedField] = useState<string | null>(null);
  const copyToClipboard = (text: string | undefined, field: string) => {
    navigator.clipboard.writeText(text || "").then(() => {
      setCopiedField(field);

      // Reset the copied field after animation time
      setTimeout(() => {
        setCopiedField(null);
      }, 1500);
    });
  };

  return (
    <DataList.Root>
      <DataListItem
        label="Name"
        value={objectInfo.path.split("/").filter(Boolean).pop()}
        itemKey="name"
        copiedField={copiedField}
        onCopy={copyToClipboard}
      />

      <DataListItem
        label="Size"
        value={formatFileSize(objectInfo.size)}
        itemKey="size"
        copiedField={copiedField}
        onCopy={copyToClipboard}
      />

      <DataListItem
        label="Content Type"
        value={objectInfo.mime_type}
        itemKey="content_type"
        copiedField={copiedField}
        onCopy={copyToClipboard}
      />

      <DataListItem
        label="Last Modified"
        value={<DateText date={objectInfo.updated_at} includeTime={true} />}
        itemKey="updated_at"
        copiedField={copiedField}
        onCopy={(_, field) => {
          const dateStr = new Date(objectInfo.updated_at).toLocaleString();
          copyToClipboard(dateStr, field);
        }}
      />

      {objectInfo.metadata && objectInfo.metadata.sha256 && product.account && (
        <DataList.Item>
          <DataList.Label minWidth="120px">Checksum</DataList.Label>
          <DataList.Value>
            <Flex align="center" gap="2">
              <ChecksumVerifier
                objectUrl={`/api/${product.account.account_id}/${product.product_id}/objects/${objectInfo.path}`}
                expectedHash={objectInfo.metadata.sha256}
                algorithm="SHA-256"
              />
              <Tooltip content="Copy to clipboard">
                <IconButton
                  size="1"
                  variant="ghost"
                  color={copiedField === "sha256" ? "green" : "gray"}
                  onClick={() =>
                    copyToClipboard(objectInfo.metadata?.sha256 || "", "sha256")
                  }
                  aria-label="Copy SHA-256 checksum"
                >
                  {copiedField === "sha256" ? <CheckIcon /> : <CopyIcon />}
                </IconButton>
              </Tooltip>
            </Flex>
          </DataList.Value>
        </DataList.Item>
      )}

      <DataListItem
        label="Source URL"
        value={`https://data.source.coop/${product.account?.account_id}/${product.product_id}/${objectInfo.path}`}
        itemKey="source_url"
        copiedField={copiedField}
        onCopy={copyToClipboard}
      />

      {/* Cloud URI based on data connection details */}
      {cloudUri && (
        <DataListItem
          label="Cloud URI"
          value={cloudUri}
          itemKey="cloud_uri"
          copiedField={copiedField}
          onCopy={copyToClipboard}
        />
      )}
    </DataList.Root>
  );
}
