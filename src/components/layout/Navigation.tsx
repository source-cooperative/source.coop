import { Container, Flex } from "@radix-ui/themes";
import { Logo } from "./Logo";
import styles from "./Navigation.module.css";
import { Suspense } from "react";
import { AuthButtons } from "./AuthButtons";
import { AccountDropdownSkeleton } from "./AccountDropdown";

export async function Navigation() {
  return (
    <nav className={styles.nav}>
      <Container>
        <Flex justify="between" align="center" py="2" px="2" gap="4">
          <Logo />

          {/* AuthButtons owns the right side: the Products link plus the account
              controls (desktop dropdown / mobile hamburger, or login). */}
          <Suspense fallback={<AccountDropdownSkeleton />}>
            <AuthButtons />
          </Suspense>
        </Flex>
      </Container>
    </nav>
  );
}
