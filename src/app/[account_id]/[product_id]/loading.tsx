import { Container, Box, Flex, Card, Text } from '@radix-ui/themes';
import { Skeleton } from '@/components/core';

export default function ProductPageLoading() {
  return (
    <Container>
      {/* Product Header Skeleton */}
      <Box mb="6">
        <Flex direction="column" gap="3">
          <Skeleton height="32px" width="60%" />
          <Skeleton height="20px" width="40%" />
          <Flex gap="2" mt="2">
            <Skeleton height="24px" width="80px" />
            <Skeleton height="24px" width="100px" />
          </Flex>
        </Flex>
      </Box>

      {/* Object Browser Skeleton */}
      <Box mt="4">
        <Card>
          <Box p="4">
            {/* Breadcrumb Skeleton */}
            <Flex gap="2" mb="4" align="center">
              <Skeleton height="16px" width="60px" />
              <Skeleton height="16px" width="16px" />
              <Skeleton height="16px" width="80px" />
            </Flex>

            {/* Directory List Skeleton */}
            <Box>
              {Array.from({ length: 8 }).map((_, index) => (
                <Flex
                  key={index}
                  align="center"
                  gap="3"
                  p="2"
                  style={{
                    borderBottom: index < 7 ? '1px solid var(--gray-5)' : 'none',
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
      </Box>
    </Container>
  );
}
