import { Box, Flex } from "@radix-ui/themes";
import { Skeleton } from "./Skeleton";

interface FormSkeletonProps {
  fieldCount?: number;
  showSubmitButton?: boolean;
}

export function FormSkeleton({
  fieldCount = 4,
  showSubmitButton = true,
}: FormSkeletonProps) {
  return (
    <>
      <Box mb="4">
        <Skeleton height="32px" width="300px" mb="1" />
        <Skeleton height="16px" width="400px" />
      </Box>

      <Box style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        {Array.from({ length: fieldCount }).map((_, index) => (
          <Box
            key={index}
            style={{ display: "flex", flexDirection: "column", gap: "8px" }}
          >
            <Skeleton height="16px" width="120px" />
            <Skeleton height="40px" width="100%" />
            <Skeleton height="14px" width="200px" />
          </Box>
        ))}

        {showSubmitButton && (
          <Flex justify="end" mt="4">
            <Skeleton height="36px" width="140px" />
          </Flex>
        )}
      </Box>
    </>
  );
}
