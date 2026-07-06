import { Box, Card, Flex, Skeleton } from "@radix-ui/themes";
import { SectionHeader } from "@/components/core/SectionHeader";

/**
 * Suspense fallback for UsageCard: reserves the card's space so the data
 * fills in instead of the column reflowing when the stats stream in.
 * Only render when analytics is configured — otherwise the real card
 * resolves to nothing and the skeleton would flash and vanish.
 */
export function UsageCardSkeleton() {
  return (
    <Card size={{ initial: "2", sm: "1" }} style={{ flexShrink: 0 }}>
      <SectionHeader title="Product Analytics">
        <Skeleton width="120px" height="16px" />
        <Flex gap="3" mt="3">
          <Skeleton width="80px" height="40px" />
          <Skeleton width="80px" height="40px" />
          <Skeleton width="80px" height="40px" />
        </Flex>
        <Box mt="3">
          <Skeleton width="100%" height="88px" />
        </Box>
      </SectionHeader>
    </Card>
  );
}
