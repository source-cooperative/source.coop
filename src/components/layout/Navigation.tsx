import { Logo } from './Logo';
import { Container, Flex } from '@radix-ui/themes';

export function Navigation() {
  return (
    <Container>
      <Flex py="4" justify="between" align="center">
        <Logo />
        {/* Add navigation items here */}
      </Flex>
    </Container>
  );
} 