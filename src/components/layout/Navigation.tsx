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
        <Flex justify="between" align="center" py="3" gap="1">
          <Logo />

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
