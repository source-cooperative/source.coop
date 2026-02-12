import { Box, Skeleton, Flex } from "@radix-ui/themes";

export default function Loading() {
  return (
    <Box>
      {/* Header skeleton */}
      <Flex justify="between" align="center" mb="6">
        <Flex align="center" gap="4">
          <Skeleton
            height="40px"
            width="40px"
            style={{ borderRadius: "50%" }}
          />
          <Box>
            <Skeleton height="20px" width="150px" mb="1" />
            <Skeleton height="16px" width="100px" />
          </Box>
          <Skeleton
            height="32px"
            width="32px"
            style={{ borderRadius: "6px" }}
          />
        </Flex>
        <Skeleton height="20px" width="100px" />
      </Flex>

      <Flex gap="6">
        {/* Left sidebar skeleton */}
        <Box style={{ minWidth: "200px", maxWidth: "250px" }}>
          <Skeleton height="16px" width="80px" mb="3" />
          <Flex direction="column" gap="1">
            <Skeleton height="36px" width="100%" />
            <Skeleton height="36px" width="100%" />
            <Skeleton height="36px" width="100%" />
          </Flex>
        </Box>

        {/* Right content skeleton */}
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Skeleton height="32px" width="200px" mb="2" />
          <Skeleton height="20px" width="300px" mb="6" />
          <Skeleton height="400px" width="100%" />
        </Box>
      </Flex>
    </Box>
  );
}
