import { Box, Card, Flex } from "@radix-ui/themes";
import { Skeleton } from "@/components/core";

/**
 * Without this, clicking the ANALYTICS tab freezes on the product view
 * until the analytics queries resolve.
 */
export default function ProductAnalyticsLoading() {
  return (
    <Box mt="4">
      <Skeleton height="24px" width="200px" mb="4" />
      <Skeleton height="40px" width="60%" mb="4" />
      <Card size="2">
        <Skeleton height="16px" width="140px" mb="4" />
        <Flex gap="3" mb="4">
          <Skeleton height="48px" width="120px" />
          <Skeleton height="48px" width="120px" />
          <Skeleton height="48px" width="120px" />
          <Skeleton height="48px" width="120px" />
        </Flex>
        <Skeleton height="220px" width="100%" />
      </Card>
    </Box>
  );
}
