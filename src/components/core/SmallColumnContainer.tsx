import { Box } from "@radix-ui/themes";

export function SmallColumnContainer({
  children,
  maxWidth = "800px",
}: {
  children: React.ReactNode;
  maxWidth?: string;
}) {
  return (
    <Box style={{ maxWidth, margin: "0 auto" }} py="4">
      {children}
    </Box>
  );
}
