"use client";

import { useState } from "react";
import { Box, Button, Card, Flex, IconButton, Link as RadixLink, Text, Tooltip } from "@radix-ui/themes";
import { BarChartIcon, Cross1Icon } from "@radix-ui/react-icons";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import type { PopularFile } from "@/lib/clients/analytics";
import Link from "next/link";
import { objectUrl } from "@/lib/urls";

const DEFAULT_VISIBLE = 10;

interface PopularFilesSidebarProps {
  files: PopularFile[];
  accountId: string;
  productId: string;
}

export function PopularFilesSidebar({
  files,
  accountId,
  productId,
}: PopularFilesSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);

  if (files.length === 0) return null;

  const visibleFiles = showAll ? files : files.slice(0, DEFAULT_VISIBLE);
  const hasMore = files.length > DEFAULT_VISIBLE;

  if (!isOpen) {
    return (
      <Box>
        <Tooltip content="Popular files">
          <IconButton
            size="1"
            variant="soft"
            color="gray"
            onClick={() => setIsOpen(true)}
          >
            <BarChartIcon />
          </IconButton>
        </Tooltip>
      </Box>
    );
  }

  return (
    <Card size="1">
      <Flex justify="between" align="center" mb="3">
        <Text size="2" weight="bold">Popular Files</Text>
        <IconButton
          size="1"
          variant="ghost"
          color="gray"
          onClick={() => setIsOpen(false)}
        >
          <Cross1Icon />
        </IconButton>
      </Flex>
      <Flex direction="column" gap="3">
        {visibleFiles.map((file, index) => (
          <PopularFileEntry
            key={file.file_path}
            file={file}
            index={index}
            accountId={accountId}
            productId={productId}
          />
        ))}
      </Flex>
      {hasMore && !showAll && (
        <Box mt="3">
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
    </Card>
  );
}

function PopularFileEntry({
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
    <Box>
      <Flex justify="between" align="center" gap="2">
        <Tooltip content={file.file_path}>
          <RadixLink size="1" asChild color="gray" underline="hover">
            <Link href={objectUrl(accountId, productId, file.file_path)}>
              <Text size="1" truncate style={{ maxWidth: 160 }}>
                {fileName}
              </Text>
            </Link>
          </RadixLink>
        </Tooltip>
        <Text size="1" color="gray" style={{ whiteSpace: "nowrap" }}>
          {file.total_downloads.toLocaleString()}
        </Text>
      </Flex>
      <Box mt="1" style={{ width: "100%", height: 24 }}>
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
    </Box>
  );
}
