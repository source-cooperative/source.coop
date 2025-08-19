import { Box, Flex, Card } from "@radix-ui/themes";
import { SectionHeader, Skeleton } from "@/components/core";

export default function ProductPageLoading() {
  return (
    <Card>
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
        <Box>
          {Array.from({ length: 8 }).map((_, index) => (
            <Flex
              key={index}
              align="center"
              gap="3"
              px="1"
              py="2"
              style={{
                borderTop: index < 7 ? "1px solid var(--gray-5)" : "none",
                borderBottom: index < 7 ? "1px solid var(--gray-5)" : "none",
              }}
            >
              <Skeleton height="16px" width="16px" />
              <Skeleton height="16px" width={`${60 + Math.random() * 40}%`} />
              <Box ml="auto">
                <Skeleton height="16px" width="60px" />
              </Box>
            </Flex>
          ))}
        </Box>
      </Box>
    </Card>
  );
}
