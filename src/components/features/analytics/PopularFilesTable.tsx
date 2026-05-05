"use client";

import { useState } from "react";
import { Box, Button, Flex, Link as RadixLink, Text, Tooltip } from "@radix-ui/themes";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import type { PopularFile } from "@/lib/clients/analytics";
import Link from "next/link";
import { objectUrl } from "@/lib/urls";

const DEFAULT_VISIBLE = 10;

interface PopularFilesTableProps {
  files: PopularFile[];
  accountId: string;
  productId: string;
}

export function PopularFilesTable({
  files,
  accountId,
  productId,
}: PopularFilesTableProps) {
  const [showAll, setShowAll] = useState(false);

  if (files.length === 0) return null;

  const visibleFiles = showAll ? files : files.slice(0, DEFAULT_VISIBLE);
  const hasMore = files.length > DEFAULT_VISIBLE;

  return (
    <Box>
      <Text size="1" color="gray" mb="2" asChild>
        <Box mb="2">Popular Files</Box>
      </Text>
      <Flex direction="column" gap="2">
        {visibleFiles.map((file, index) => (
          <PopularFileRow
            key={file.file_path}
            file={file}
            index={index}
            accountId={accountId}
            productId={productId}
          />
        ))}
      </Flex>
      {hasMore && !showAll && (
        <Box mt="2">
          <Button
            size="1"
            variant="soft"
            color="gray"
            onClick={() => setShowAll(true)}
          >
            Show {files.length - DEFAULT_VISIBLE} more
          </Button>
        </Box>
      )}
    </Box>
  );
}

function PopularFileRow({
  file,
  index,
  accountId,
  productId,
}: {
  file: PopularFile;
  index: number;
  accountId: string;
  productId: string;
}) {
  const fileName = file.file_path.split("/").pop() || file.file_path;

  return (
    <Flex align="center" gap="3">
      <Box style={{ flex: 1, minWidth: 0 }}>
        <Tooltip content={file.file_path}>
          <RadixLink size="1" asChild color="gray" underline="hover">
            <Link href={objectUrl(accountId, productId, file.file_path)}>
              <Text size="1" truncate>
                {fileName}
              </Text>
            </Link>
          </RadixLink>
        </Tooltip>
      </Box>
      <Box style={{ width: 80, height: 24, flexShrink: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={file.daily} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`gradient-pop-${index}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent-9)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="var(--accent-9)" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="downloads"
              stroke="var(--accent-9)"
              strokeWidth={1}
              fill={`url(#gradient-pop-${index})`}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </Box>
      <Text size="1" color="gray" style={{ whiteSpace: "nowrap", minWidth: 40, textAlign: "right" }}>
        {file.total_downloads.toLocaleString()}
      </Text>
    </Flex>
  );
}
