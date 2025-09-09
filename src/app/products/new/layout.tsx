import { Box } from "@radix-ui/themes";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <Box
      style={{ maxWidth: "800px", margin: "0 auto" }}
    >
      {children}
    </Box>
  );
}
