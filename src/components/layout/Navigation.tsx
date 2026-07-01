import { Container, Flex, Link } from "@radix-ui/themes";
import NextLink from "next/link";
import { Logo } from "./Logo";
import styles from "./Navigation.module.css";
import { Suspense } from "react";
import { AuthButtons } from "./AuthButtons";
import { AccountDropdownSkeleton } from "./AccountDropdown";
import { productListUrl } from "@/lib";

export async function Navigation() {
  return (
    <nav className={styles.nav}>
      <Container>
        <Flex justify="between" align="center" py="2" px="2" gap="4">
          {/* Primary navigation: logo + top-level links, shown to everyone */}
          <Flex align="center" gap="5">
            <Logo />
            <Link asChild size="3" color="gray" highContrast underline="hover">
              <NextLink href={productListUrl()}>Products</NextLink>
            </Link>
          </Flex>

          <Flex gap="4" align="center">
            <Suspense fallback={<AccountDropdownSkeleton />}>
              <AuthButtons />
            </Suspense>
          </Flex>
        </Flex>
      </Container>
    </nav>
  );
}
