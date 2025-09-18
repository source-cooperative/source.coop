import { Box, Card, Grid, Flex, DataList } from "@radix-ui/themes";
import { SectionHeader, Skeleton } from "@/components/core";
// import { ProductContentsLoading } from "./(product)/[[...path]]/loading";
import DirectoryListLoading from "./(product)/[[...path]]/loading";

export default function ProductDetailsLoading() {
  return (
    <>
      <Grid
        columns={{ initial: "1", md: "3" }}
        gap={{ initial: "0", md: "6" }}
        px={{ initial: "0" }}
      >
        {/* Product Summary Card Skeleton - spans 2 columns */}
        <Box
          width="100%"
          className="product-summary"
          style={{ gridColumn: "span 2" }}
          px={{ initial: "4", md: "0" }}
          mb={{ initial: "4", md: "0" }}
        >
          <Box mb="4">
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
        </Box>

        {/* Product Meta Card Skeleton - 1 column */}
        <Box width="100%" className="product-meta">
          <Card style={{ height: "100%" }} size={{ initial: "2", sm: "1" }}>
            <SectionHeader title="Product Details">
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
                      <Skeleton
                        height="36px"
                        width="36px"
                        borderRadius="full"
                      />
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
        </Box>
      </Grid>

      {/* Product Contents Skeleton */}
      <Card mt="4">
        <Box>
          {/* Breadcrumb Skeleton */}
          <SectionHeader title="Product Contents">
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
    </>
  );
}
