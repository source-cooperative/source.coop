import { Container, Flex, Link, Separator } from "@radix-ui/themes";
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
          <Logo />

          {/* Products (shown to everyone), divided from the account controls.
              `.nav .productsLink` styling stays immune to the marketing page's
              `.landing a` uppercase/underline rule (higher specificity). */}
          <Flex align="center" gap="4">
            <Link asChild size="3" className={styles.productsLink}>
              <NextLink href={productListUrl()}>Products</NextLink>
            </Link>
            <Separator orientation="vertical" style={{ height: "1.5rem" }} />
            <Suspense fallback={<AccountDropdownSkeleton />}>
              <AuthButtons />
            </Suspense>
          </Flex>
        </Flex>
      </Container>
    </nav>
  );
}
