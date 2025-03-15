'use client';

import { Container, Text, Box, Link as RadixLink, Flex } from '@radix-ui/themes';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MonoText } from '@/components/core';

export function Footer() {
  const pathname = usePathname();

  return (
    <Box py="4" mt="6" style={{ borderTop: '1px solid var(--gray-5)' }}>
      <Container size="4">
        <Flex direction="column" gap="3">
          <Flex direction="column" gap="2">
            {pathname !== '/' && (
              <Link href="/" passHref legacyBehavior>
                <RadixLink color="gray" underline="always">
                  <MonoText size="2">Home</MonoText>
                </RadixLink>
              </Link>
            )}
            <Link href="/repositories" passHref legacyBehavior>
              <RadixLink color="gray" underline="always">
                <MonoText size="2">All Repositories</MonoText>
              </RadixLink>
            </Link>
            <RadixLink href="https://docs.source.coop" color="gray" underline="always">
              <MonoText size="2">Docs</MonoText>
            </RadixLink>
          </Flex>
          
          <Flex direction="column" gap="3" align="start">
            <Box style={{ 
              height: '1px', 
              background: 'var(--gray-5)', 
              width: '100%'
            }} />
            <MonoText size="2" color="gray">
              Source Cooperative is a{' '}
              <RadixLink 
                href="https://radiant.earth" 
                color="gray" 
                style={{ textDecoration: 'underline' }}
              >
                <MonoText size="2" style={{ textTransform: 'uppercase' }}>
                  Radiant Earth
                </MonoText>
              </RadixLink>
              {' '}initiative
            </MonoText>
          </Flex>
        </Flex>
      </Container>
    </Box>
  );
} 