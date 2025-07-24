"use client";

import { Container, Flex, DropdownMenu, Text } from "@radix-ui/themes";
import Link from "next/link";
import { useState } from "react";
import { Logo } from "./Logo";
import { ProfileAvatar } from "@/components/features/profiles/ProfileAvatar";
import { ChevronDownIcon } from "@radix-ui/react-icons";
import styles from "./Navigation.module.css";
import { useAccount } from "@/hooks/useAccount";
import { useRouter } from "next/navigation";
export function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  // Only fetch account when we have a valid account ID
  const { account, session, isLoading } = useAccount();

  // Loading state
  if (isLoading) {
    return (
      <nav className={styles.nav}>
        <Container>
          <Flex justify="between" align="center" py="3">
            <Logo />
            {/* <Text>Loading...</Text> */}
          </Flex>
        </Container>
      </nav>
    );
  }

  // If we have a session but no account, that means a user is authenticated but we need
  // to redirect to the email verification page so that a user can setup their account.
  if (session && !account) {
    router.push("/onboarding");
  }

  return (
    <nav className={styles.nav}>
      <Container>
        <Flex justify="between" align="center" py="3">
          <Logo />

          <Flex gap="4" align="center">
            {account ? (
              <DropdownMenu.Root open={isOpen} onOpenChange={setIsOpen}>
                <DropdownMenu.Trigger>
                  <Flex align="center" gap="2" style={{ cursor: "pointer" }}>
                    <ProfileAvatar account={account} size="2" />
                    <Text>{account.name}</Text>
                    <ChevronDownIcon
                      className={styles.chevron}
                      data-state={isOpen ? "open" : "closed"}
                    />
                  </Flex>
                </DropdownMenu.Trigger>

                <DropdownMenu.Content>
                  <DropdownMenu.Label>Account</DropdownMenu.Label>
                  <DropdownMenu.Item>
                    <Link href={`/${account.account_id}`}>View Profile</Link>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item>
                    <Link href={`/${account.account_id}/edit`}>
                      Edit Profile
                    </Link>
                  </DropdownMenu.Item>
                  <DropdownMenu.Separator />
                  <DropdownMenu.Label>Organizations</DropdownMenu.Label>
                  <DropdownMenu.Item>
                    <Link href={`/${account.account_id}/organization/new`}>
                      Create Organization
                    </Link>
                  </DropdownMenu.Item>
                  <DropdownMenu.Separator />
                  <DropdownMenu.Item color="red">
                    <Link
                      className="underline block w-full"
                      href={`/auth/logout`}
                    >
                      Logout
                    </Link>
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Root>
            ) : (
              // <Link href={CONFIG.auth.routes.login}>
              //   <Button>Log In / Register</Button>
              // </Link>
              null
            )}
          </Flex>
        </Flex>
      </Container>
    </nav>
  );
}
