'use client';

import { Container, Box, Link as RadixLink } from '@radix-ui/themes';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MonoText } from '@/components/core';

export function Footer() {
  const pathname = usePathname();

  return (
    <Box py="4" mt="6" style={{ borderTop: "1px solid var(--gray-5)" }}>
      <Container size="4">
        <Box>
          <Box mb="3">
            {pathname !== "/" && (
              <Box mb="2">
                <Link href="/" passHref legacyBehavior>
                  <RadixLink color="gray" underline="always">
                    <MonoText size="2">Home</MonoText>
                  </RadixLink>
                </Link>
              </Box>
            )}
            <Box mb="2">
              <Link href="/products" passHref legacyBehavior>
                <RadixLink color="gray" underline="always">
                  <MonoText size="2">All Products</MonoText>
                </RadixLink>
              </Link>
            </Box>
            <Box>
              <RadixLink
                href="https://docs.source.coop"
                color="gray"
                underline="always"
              >
                <MonoText size="2">Docs</MonoText>
              </RadixLink>
            </Box>
          </Box>

          <Box>
            <Box
              mb="3"
              style={{
                height: "1px",
                background: "var(--gray-5)",
                width: "100%",
              }}
            />
            <MonoText size="2" color="gray">
              Source Cooperative is a{" "}
              <RadixLink
                href="https://radiant.earth"
                color="gray"
                style={{ textDecoration: "underline" }}
              >
                <MonoText size="2" style={{ textTransform: "uppercase" }}>
                  Radiant Earth
                </MonoText>
              </RadixLink>{" "}
              project
            </MonoText>
          </Box>
        </Box>
      </Container>
    </Box>
  );
} 