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
import { MonoText, SectionHeader } from "@/components/core";

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
    <SectionHeader title="Object details">
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

    </DataList.Root>

    {/* Action Buttons */}
    <Box mt="4" style={{ paddingTop: "var(--space-4)" }}>
      <Flex gap="3" align="center">
        {/* Primary Download Button */}
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
        
        {/* Secondary Copy URL Button */}
        <Button
          variant="outline"
          size="3"
          color={copiedField === "source_url" ? "green" : "gray"}
          onClick={() => {
            copyToClipboard(
              `https://data.source.coop/${product.account_id}/${product.product_id}/${objectInfo.path}`,
              "source_url"
            );
          }}
        >
          {copiedField === "source_url" ? <CheckIcon /> : <CopyIcon />}
          Copy URL
        </Button>
        
        {/* Secondary Copy Cloud URI Button (if available) */}
        {cloudUri && (
          <Button
            variant="outline"
            size="3"
            color={copiedField === "cloud_uri" ? "green" : "gray"}
            onClick={() => {
              copyToClipboard(cloudUri, "cloud_uri");
            }}
          >
            {copiedField === "cloud_uri" ? <CheckIcon /> : <CopyIcon />}
            Copy Cloud URI
          </Button>
        )}
      </Flex>
    </Box>
    </SectionHeader>
    </>
  );
}
