import { Container, Flex, Button } from "@radix-ui/themes";
import Link from "next/link";
import { CONFIG } from "@/lib";
import { AccountDropdown } from "./AccountDropdown";
import { Logo } from "./Logo";
import styles from "./Navigation.module.css";
import { OnboardingCheck } from "@/components/core/OnboardingCheck";
import { Account } from "@/types/account";

export async function Navigation({ account }: { account?: Account }) {
  return (
    <nav className={styles.nav}>
      <Container>
        <Flex justify="between" align="center" py="3">
          <Logo />

          <Flex gap="4" align="center">
            {account ? (
              <AccountDropdown account={account} />
            ) : (
              <Link href={CONFIG.auth.routes.login}>
                <Button>Log In / Register</Button>
              </Link>
            )}
          </Flex>
          <OnboardingCheck account={account} />
        </Flex>
      </Container>
    </nav>
  );
}
