import { Box, Flex, Skeleton } from "@radix-ui/themes";

export default function Loading() {
  return (
    <Box>
      {/* FormTitle skeleton */}
      <Box mb="6">
        <Skeleton height="32px" width="200px" mb="2" />
        <Skeleton height="20px" width="350px" />
      </Box>

      {/* ProfileImageUpload skeleton */}
      <Flex direction="column" gap="4">
        {/* Description Section */}
        <Box>
          <Flex direction="column" gap="2">
            <Skeleton height="20px" width="180px" mb="1" />
            <Skeleton height="16px" width="100%" />
            <Skeleton height="16px" width="80%" />
          </Flex>
        </Box>

        {/* Avatar Preview */}
        <Flex>
          <Skeleton
            width="144px"
            height="144px"
            style={{ borderRadius: "var(--radius-full)" }}
          />
        </Flex>

        {/* Buttons */}
        <Flex gap="2" align="center">
          <Skeleton height="36px" width="180px" />
          <Skeleton height="36px" width="140px" />
        </Flex>

        {/* Image Guidelines */}
        <Box
          p="3"
          style={{
            backgroundColor: "var(--gray-3)",
            borderRadius: "var(--radius-2)",
          }}
        >
          <Flex direction="column" gap="2">
            <Skeleton height="16px" width="140px" mb="1" />
            <Skeleton height="14px" width="100%" />
            <Skeleton height="14px" width="95%" />
            <Skeleton height="14px" width="90%" />
            <Skeleton height="14px" width="85%" />
          </Flex>
        </Box>
      </Flex>
    </Box>
  );
}
