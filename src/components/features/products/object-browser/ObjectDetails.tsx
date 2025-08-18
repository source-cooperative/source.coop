'use client';

import { Card, Box, DataList, Flex, IconButton, Tooltip } from '@radix-ui/themes';
import { CopyIcon, CheckIcon } from '@radix-ui/react-icons';
import type { ProductObject } from '@/types';
import type { Product } from "@/types";
import { SectionHeader } from '@/components/core';
import { DateText, BreadcrumbNav } from '@/components/display';
import { ChecksumVerifier } from '../ChecksumVerifier';
import { formatFileSize } from './utils';
import { useState, useEffect } from 'react';
import { DataListItem } from "./DataListItem";

interface ObjectDetailsProps {
  product: Product;
  selectedObject: ProductObject;
  selectedDataItem: string | null;
}

export function ObjectDetails({
  product,
  selectedObject,
  selectedDataItem,
}: ObjectDetailsProps) {
  const pathParts = selectedObject.path.split("/").filter(Boolean);
  const fileName = pathParts.pop();
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Handle keyboard shortcuts directly in the component
  useEffect(() => {
    // Skip if no item is selected - no need to attach listeners
    if (!selectedDataItem) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const selection = window.getSelection();
      const hasSelection = selection && selection.toString().length > 0;
      const isInput =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement;

      // Skip if there's text selected or we're in an input
      if (hasSelection || isInput) return;

      // Handle copy with Cmd/Ctrl+C or Enter
      if (e.key === "Enter" || ((e.ctrlKey || e.metaKey) && e.key === "c")) {
        e.preventDefault();

        // Find the element with the selected data item
        const element = document.querySelector(
          `[data-selectable="true"][data-item="${selectedDataItem}"]`
        );
        if (element) {
          const text = element.textContent || "";
          navigator.clipboard.writeText(text);

          // Update the copied field
          setCopiedField(selectedDataItem);

          // Reset after animation time
          setTimeout(() => {
            setCopiedField(null);
          }, 1500);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedDataItem]);

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
    <Card>
      <SectionHeader title="Product Contents">
        <Box
          style={{
            borderBottom: "1px solid var(--gray-5)",
            paddingBottom: "var(--space-3)",
            marginBottom: "var(--space-3)",
          }}
        >
          <Flex justify="between" align="center">
            <BreadcrumbNav
              path={pathParts}
              fileName={fileName}
              baseUrl={`/${product.account_id}/${product.product_id}`}
            />
          </Flex>
        </Box>
      </SectionHeader>

      <DataList.Root>
        <DataListItem
          label="Name"
          value={fileName}
          selectedDataItem={selectedDataItem}
          itemKey="name"
          copiedField={copiedField}
          onCopy={copyToClipboard}
        />

        <DataListItem
          label="Size"
          value={formatFileSize(selectedObject.size)}
          selectedDataItem={selectedDataItem}
          itemKey="size"
          copiedField={copiedField}
          onCopy={copyToClipboard}
        />

        <DataListItem
          label="Content Type"
          value={selectedObject.mime_type}
          selectedDataItem={selectedDataItem}
          itemKey="content_type"
          copiedField={copiedField}
          onCopy={copyToClipboard}
        />

        <DataListItem
          label="Last Modified"
          value={
            <DateText date={selectedObject.updated_at} includeTime={true} />
          }
          selectedDataItem={selectedDataItem}
          itemKey="updated_at"
          copiedField={copiedField}
          onCopy={(_, field) => {
            const dateStr = new Date(
              selectedObject.updated_at
            ).toLocaleString();
            copyToClipboard(dateStr, field);
          }}
        />

        {selectedObject.metadata &&
          selectedObject.metadata.sha256 &&
          product.account && (
            <DataList.Item>
              <DataList.Label minWidth="120px">Checksum</DataList.Label>
              <DataList.Value>
                <Flex align="center" gap="2">
                  <ChecksumVerifier
                    objectUrl={`/api/${product.account.account_id}/${product.product_id}/objects/${selectedObject.path}`}
                    expectedHash={selectedObject.metadata.sha256}
                    algorithm="SHA-256"
                  />
                  <Tooltip content="Copy to clipboard">
                    <IconButton
                      size="1"
                      variant="ghost"
                      color={copiedField === "sha256" ? "green" : "gray"}
                      onClick={() =>
                        copyToClipboard(
                          selectedObject.metadata?.sha256 || "",
                          "sha256"
                        )
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
          value={`https://data.source.coop/${product.account?.account_id}/${product.product_id}/${selectedObject.path}`}
          selectedDataItem={selectedDataItem}
          itemKey="source_url"
          copiedField={copiedField}
          onCopy={copyToClipboard}
        />

        {/* 
        TODO: On production, this is based on dataConnectionDetails, but we don't have that data here.
  
        {dataConnectionDetails.s3DataConnection ? `s3://${dataConnectionDetails.s3DataConnection.bucket}/${account_id}/${resultState.key}` : ""}
        {dataConnectionDetails.azureDataConnection ? `https://${dataConnectionDetails.azureDataConnection.account_name}.blob.core.windows.net/${dataConnectionDetails.azureDataConnection.container_name}/${account_id}/${resultState.key}` : ""}
        */}
        {/* {product.metadata?.mirrors && product.metadata.primary_mirror && (
          <DataListItem
            label="Cloud URI"
            value={`s3://${
              product.metadata.mirrors[product.metadata.primary_mirror]
                .config.bucket
            }/${
              product.metadata.mirrors[product.metadata.primary_mirror]
                .prefix
            }${selectedObject.path}`}
            selectedDataItem={selectedDataItem}
            itemKey="cloud_uri"
            copiedField={copiedField}
            onCopy={copyToClipboard}
          />
        )} */}
      </DataList.Root>
    </Card>
  );
} 