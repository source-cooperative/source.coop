import { Box, Flex } from "@radix-ui/themes";
import { Skeleton } from "@/components/core";

export default function DirectoryListLoading() {
  return (
    <Box>
      {Array.from({ length: 8 }).map((_, index) => (
        <Flex key={index} align="center" gap="3" px="1" py="2" style={{}}>
          <Skeleton height="16px" width="16px" />
          <Skeleton height="16px" width={`${60 + Math.random() * 40}%`} />
          <Box ml="auto">
            <Skeleton height="16px" width="60px" />
          </Box>
        </Flex>
      ))}
    </Box>
  );
}
