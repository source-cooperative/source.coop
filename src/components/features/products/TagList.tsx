import { Text, Box, Flex } from "@radix-ui/themes";
import Link from "next/link";
import type { ComponentProps } from "react";

interface TagListProps {
  tags: string[];
  /** Optional link prefix (defaults to /products?tags=) */
  linkPrefix?: string;
  /** Optional Flex component props */
  flexProps?: ComponentProps<typeof Flex>;
  /** Optional Box component props for each tag */
  boxProps?: ComponentProps<typeof Box>;
  /** Optional Text component props for each tag */
  textProps?: ComponentProps<typeof Text>;
}

export function TagList({ 
  tags, 
  linkPrefix = "/products?tags=",
  flexProps,
  boxProps,
  textProps
}: TagListProps) {
  if (!tags || tags.length === 0) {
    return null;
  }

  return (
    <Flex 
      gap="2" 
      wrap="wrap" 
      my="2" 
      {...flexProps}
    >
      {tags.map((tag, index) => (
        <Link
          key={index}
          href={`${linkPrefix}${encodeURIComponent(tag)}`}
          style={{ textDecoration: "none" }}
        >
          <Box
            px="2"
            py="0"
            style={{
              backgroundColor: "var(--gray-3)",
              borderRadius: "var(--radius-3)",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            className="hover:bg-gray-4 hover:border-gray-6"
            {...boxProps}
          >
            <Text size="1" color="gray" {...textProps}>
              {tag}
            </Text>
          </Box>
        </Link>
      ))}
    </Flex>
  );
}
