import { Container, Flex, Button } from "@radix-ui/themes";
import Link from "next/link";
import { CONFIG } from "@/lib";
import { AccountDropdown } from "./AccountDropdown";
import { Logo } from "./Logo";
import styles from "./Navigation.module.css";
import { getPageSession } from "@/lib/api/utils";

export async function Navigation() {
  const session = await getPageSession();

  return (
    <nav className={styles.nav}>
      <Container>
        <Flex justify="between" align="center" py="3">
          <Logo />

          <Flex gap="4" align="center">
            {session?.account ? (
              <AccountDropdown account={session.account} />
            ) : (
              <Link href={CONFIG.auth.routes.login}>
                <Button>Log In / Register</Button>
              </Link>
            )}
          </Flex>
        </Flex>
      </Container>
    </nav>
  );
}
