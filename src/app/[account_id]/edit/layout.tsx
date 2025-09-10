import { Box, Container } from "@radix-ui/themes";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <Container size="4" py="4">
      <Box py="2">{children}</Box>
    </Container>
  );
}
