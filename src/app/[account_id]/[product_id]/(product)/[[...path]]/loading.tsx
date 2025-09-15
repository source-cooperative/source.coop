import { Box, Flex, Card } from "@radix-ui/themes";
import { SectionHeader, Skeleton } from "@/components/core";

export default function ProductContentsLoading() {
  // Skeleton for just the product contents as the product header is loaded in the layout
  return (
    <Card mt="4">
      <Box pt="0">
        {/* Breadcrumb Skeleton */}
        <SectionHeader title="Product Contents">
          <Flex gap="2" mb="4" align="center">
            <Skeleton height="16px" width="60px" />
            <Skeleton height="16px" width="16px" />
            <Skeleton height="16px" width="80px" />
          </Flex>
        </SectionHeader>

        {/* Directory List Skeleton */}
        <DirectoryListLoading />
      </Box>
    </Card>
  );
}

export function DirectoryListLoading() {
  return (
    <Box>
      {Array.from({ length: 8 }).map((_, index) => (
        <Flex key={index} align="center" gap="3" px="1" py="2" style={{}}>
          <Skeleton height="16px" width="16px" />
          <Skeleton height="16px" width={`${60 + Math.random() * 40}%`} />
          <Box ml="auto">
            <Skeleton height="16px" width="60px" />
          </Box>
        </Flex>
      ))}
    </Box>
  );
}
