import { Container, Box, Heading, Flex } from "@radix-ui/themes";
import { Skeleton } from "@/components/core";

export default function HomePageLoading() {
  return (
    <Container size="4" py="6">
      <Box>
        <Heading size="6" mb="4">
          Featured Products
        </Heading>

        {/* Product List Skeleton */}
        <Box>
          {Array.from({ length: 6 }).map((_, index) => (
            <Box
              key={index}
              p="4"
              mb="4"
              style={{
                border: "1px solid var(--gray-5)",
                borderRadius: "var(--radius-3)",
                background: "var(--gray-1)",
              }}
            >
              {/* Product Title */}
              <Skeleton
                height="24px"
                width={`${50 + Math.random() * 40}%`}
                mb="2"
              />

              {/* Product Description */}
              <Box mb="4">
                <Skeleton height="16px" width="90%" mb="1" />
                <Skeleton height="16px" width={`${60 + Math.random() * 30}%`} />
              </Box>

              {/* Metadata Row */}
              <Flex gap="3" align="center">
                <Skeleton height="14px" width="80px" />
                <Skeleton height="14px" width="120px" />
                <Skeleton height="20px" width="60px" />
              </Flex>
            </Box>
          ))}
        </Box>
      </Box>
    </Container>
  );
}
