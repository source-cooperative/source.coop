import { Box, Skeleton } from "@radix-ui/themes";

export default function SecurityLoading() {
  return (
    <Box>
      <Skeleton height="32px" width="200px" mb="2" />
      <Skeleton height="20px" width="300px" mb="6" />
      <Skeleton height="400px" width="100%" />
    </Box>
  );
}
