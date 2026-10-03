import { Box } from "@radix-ui/themes";

export function SmallColumnContainer({ children }: { children: React.ReactNode }) {
  return (
    <Box style={{ maxWidth: "800px", margin: "0 auto" }} py="4">
      {children}
    </Box>
  );
}
