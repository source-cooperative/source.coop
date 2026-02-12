import { Container, Flex } from "@radix-ui/themes";

export default function EmailVerifiedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Container size="2" py="4">
      <Flex
        direction="column"
        align="center"
        justify="center"
        style={{ minHeight: "60vh" }}
      >
        {children}
      </Flex>
    </Container>
  );
}
