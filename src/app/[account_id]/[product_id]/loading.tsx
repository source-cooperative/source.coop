import { Box, Card, Grid, Flex } from "@radix-ui/themes";
import { SectionHeader, Skeleton } from "@/components/core";
import ProductContentsLoading from "./(product)/[[...path]]/loading";

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
              <Box>
                {/* Visibility Badge Skeleton */}
                <Flex justify="between" align="center" mb="4">
                  <Skeleton height="16px" width="60px" />
                  <Skeleton height="20px" width="50px" />
                </Flex>

                {/* Owner Skeleton */}
                <Flex justify="between" align="center" mb="4">
                  <Skeleton height="16px" width="40px" />
                  <Flex gap="2" align="center">
                    <Skeleton
                      height="24px"
                      width="24px"
                      className="rounded-full"
                    />
                    <Skeleton height="16px" width="80px" />
                  </Flex>
                </Flex>

                {/* Created Date Skeleton */}
                <Flex justify="between" align="center" mb="4">
                  <Skeleton height="16px" width="50px" />
                  <Skeleton height="16px" width="100px" />
                </Flex>

                {/* Last Updated Skeleton */}
                <Flex justify="between" align="center">
                  <Skeleton height="16px" width="80px" />
                  <Skeleton height="16px" width="100px" />
                </Flex>
              </Box>
            </SectionHeader>
          </Card>
        </Box>
      </Grid>
      <ProductContentsLoading />
    </>
  );
}
