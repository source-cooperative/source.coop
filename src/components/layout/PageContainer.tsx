import { Container, Box, ContainerProps } from "@radix-ui/themes";
import { ReactNode } from "react";

interface PageContainerProps extends ContainerProps {
  children: ReactNode;
}

export function PageContainer({
  children,
  size = "4",
  py = "6",
  ...props
}: PageContainerProps) {
  return (
    <Container size={size} py={py} {...props}>
      <Box>{children}</Box>
    </Container>
  );
}
