import { Logo } from './Logo';
import { Container, Flex } from '@radix-ui/themes';

export function Navigation() {
  return (
    <Container>
      <Flex align="center" justify="between" py="4">
        <Logo />
        {/* Add navigation items here */}
      </Flex>
    </Container>
  );
} 