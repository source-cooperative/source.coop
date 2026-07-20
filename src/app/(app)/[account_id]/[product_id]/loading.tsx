import { Box, Card, Grid, Flex, DataList } from "@radix-ui/themes";
import { SectionHeader, Skeleton } from "@/components/core";
import { UsageCardSkeleton } from "@/components/features/analytics";
import { isAnalyticsConfigured } from "@/lib/clients/analytics";
import DirectoryListLoading from "./(product)/[[...path]]/loading";

export default function ProductDetailsLoading() {
  return (
    <Grid mt="4" columns={{ initial: "1", md: "3" }} gap={{ initial: "4", md: "6" }}>
      {/* Left column: summary + contents */}
      <Flex
        direction="column"
        gap="4"
        className="product-summary"
        style={{ gridColumn: "span 2" }}
        px={{ initial: "4", md: "0" }}
      >
        <Box>
          {/* Title Skeleton */}
          <Skeleton height="48px" width="80%" mb="2" />

          {/* Description Skeleton */}
          <Skeleton height="24px" width="100%" mb="2" />
          <Skeleton height="24px" width="90%" mb="4" />

          {/* Tags Skeleton */}
          <Flex gap="2" wrap="wrap">
            <Skeleton height="24px" width="80px" />
            <Skeleton height="24px" width="120px" />
            <Skeleton height="24px" width="100px" />
          </Flex>
        </Box>

        {/* Product Contents Skeleton */}
        <Card>
          <Box>
            {/* Breadcrumb Skeleton */}
            <SectionHeader title="Contents">
              <Flex
                pb="3"
                mb="3"
                style={{
                  borderBottom: "1px solid var(--gray-5)",
                }}
              >
                <Skeleton height="16px" width="60px" />
                <Skeleton height="16px" width="16px" />
                <Skeleton height="16px" width="80px" />
              </Flex>
            </SectionHeader>

            {/* Directory List Skeleton */}
            <DirectoryListLoading />
          </Box>
        </Card>
      </Flex>

      {/* Right column: details + analytics stacked */}
      <Flex width="100%" className="product-meta" direction="column" gap="4">
        <Card size={{ initial: "2", sm: "1" }}>
          <SectionHeader title="Details">
            <DataList.Root>
              {/* Visibility Badge Skeleton */}
              <DataList.Item>
                <DataList.Label>
                  <Skeleton height="16px" width="60px" />
                </DataList.Label>
                <DataList.Value>
                  <Skeleton height="20px" width="50px" />
                </DataList.Value>
              </DataList.Item>

              {/* Owner Skeleton */}
              <DataList.Item>
                <DataList.Label>
                  <Skeleton height="16px" width="40px" />
                </DataList.Label>
                <DataList.Value>
                  <Flex align="center" gap="2">
                    <Skeleton height="36px" width="36px" borderRadius="full" />
                    <Skeleton height="16px" width="80px" />
                  </Flex>
                </DataList.Value>
              </DataList.Item>

              {/* Created Date Skeleton */}
              <DataList.Item>
                <DataList.Label>
                  <Skeleton height="16px" width="50px" />
                </DataList.Label>
                <DataList.Value>
                  <Skeleton height="16px" width="100px" />
                </DataList.Value>
              </DataList.Item>

              {/* Last Updated Skeleton */}
              <DataList.Item>
                <DataList.Label>
                  <Skeleton height="16px" width="80px" />
                </DataList.Label>
                <DataList.Value>
                  <Skeleton height="16px" width="100px" />
                </DataList.Value>
              </DataList.Item>
            </DataList.Root>
          </SectionHeader>
        </Card>

        {isAnalyticsConfigured() && <UsageCardSkeleton />}
      </Flex>
    </Grid>
  );
}
