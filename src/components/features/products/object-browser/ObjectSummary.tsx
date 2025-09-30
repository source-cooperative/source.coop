"use client";

import { DataList, Flex, IconButton, Tooltip, Button, Box } from "@radix-ui/themes";
import { CopyIcon, CheckIcon, DownloadIcon } from "@radix-ui/react-icons";
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
import { MonoText } from "@/components/core";

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
    <>
    <DataList.Root>
      <DataList.Item>
        <DataList.Label>Name</DataList.Label>
        <DataList.Value>
          <MonoText>{objectInfo.path.split("/").filter(Boolean).pop()}</MonoText>
        </DataList.Value>
      </DataList.Item>

      <DataList.Item>
        <DataList.Label>Size</DataList.Label>
        <DataList.Value>
          <MonoText>{formatFileSize(objectInfo.size)}</MonoText>
        </DataList.Value>
      </DataList.Item>

      <DataList.Item>
        <DataList.Label>Content Type</DataList.Label>
        <DataList.Value>
          <MonoText>{objectInfo.mime_type}</MonoText>
        </DataList.Value>
      </DataList.Item>

      <DataList.Item>
        <DataList.Label>Last Modified</DataList.Label>
        <DataList.Value>
          <MonoText>
            <DateText date={objectInfo.updated_at} includeTime={true} />
          </MonoText>
        </DataList.Value>
      </DataList.Item>

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

      <DataList.Item>
        <DataList.Label>Source URL</DataList.Label>
        <DataList.Value>
          <Flex align="center" gap="2">
            <MonoText style={{ wordBreak: "break-all" }}>
              {`https://data.source.coop/${product.account_id}/${product.product_id}/${objectInfo.path}`}
            </MonoText>
            <Tooltip content="Copy to clipboard">
              <IconButton
                size="1"
                variant="ghost"
                color={copiedField === "source_url" ? "green" : "gray"}
                onClick={() =>
                  copyToClipboard(
                    `https://data.source.coop/${product.account_id}/${product.product_id}/${objectInfo.path}`,
                    "source_url"
                  )
                }
                aria-label="Copy Source URL"
              >
                {copiedField === "source_url" ? <CheckIcon /> : <CopyIcon />}
              </IconButton>
            </Tooltip>
          </Flex>
        </DataList.Value>
      </DataList.Item>

      {cloudUri && (
        <DataList.Item>
          <DataList.Label>Cloud URI</DataList.Label>
          <DataList.Value>
            <Flex align="center" gap="2">
              <MonoText style={{ wordBreak: "break-all" }}>{cloudUri}</MonoText>
              <Tooltip content="Copy to clipboard">
                <IconButton
                  size="1"
                  variant="ghost"
                  color={copiedField === "cloud_uri" ? "green" : "gray"}
                  onClick={() => copyToClipboard(cloudUri, "cloud_uri")}
                  aria-label="Copy Cloud URI"
                >
                  {copiedField === "cloud_uri" ? <CheckIcon /> : <CopyIcon />}
                </IconButton>
              </Tooltip>
            </Flex>
          </DataList.Value>
        </DataList.Item>
      )}

    </DataList.Root>

    {/* Download Button */}
    <Box mt="4" style={{ paddingTop: "var(--space-4)" }}>
      <Button
        variant="solid"
        size="3"
        asChild
      >
        <a 
          href={`https://data.source.coop/${product.account_id}/${product.product_id}/${objectInfo.path}`}
          download={objectInfo.path.split("/").filter(Boolean).pop()}
          target="_blank"
          rel="noopener noreferrer"
        >
          <DownloadIcon />
          Download
        </a>
      </Button>
    </Box>
    </>
  );
}
