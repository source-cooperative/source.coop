"use client";

import { Container, Flex } from "@radix-ui/themes";
import { Logo } from "./Logo";
import styles from "./Navigation.module.css";
import { Suspense } from "react";
import { AuthButtons } from "./AuthButtons";
import { AccountDropdownSkeleton } from "./AccountDropdown";
import { usePathname } from "next/navigation";
import { UserSession } from "@/types";

interface NavigationProps {
  session: UserSession | null;
}

export function Navigation({ session }: NavigationProps) {
  const pathname = usePathname();

  // Hide navigation on homepage when user is not authenticated
  const isHomepage = pathname === "/";
  const shouldHideNav = isHomepage && !session;

  if (shouldHideNav) {
    return null;
  }

  return (
    <nav className={styles.nav}>
      <Container>
        <Flex justify="between" align="center" py="3" gap="1">
          <Logo />

          <Flex gap="4" align="center">
            <Suspense fallback={<AccountDropdownSkeleton />}>
              <AuthButtons session={session} />
            </Suspense>
          </Flex>
        </Flex>
      </Container>
    </nav>
  );
}
