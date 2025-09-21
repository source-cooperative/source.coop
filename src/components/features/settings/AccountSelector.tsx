"use client";

import { useState } from "react";
import {
  Box,
  Flex,
  Text,
  DropdownMenu,
  Link as RadixLink,
} from "@radix-ui/themes";
import { ExternalLinkIcon } from "@radix-ui/react-icons";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Account } from "@/types";
import { AvatarLinkCompact } from "@/components";
import { accountUrl, editAccountViewUrl } from "@/lib/urls";
import { ChevronIcon } from "@/components/icons";

interface AccountSelectorProps {
  currentAccount: Account;
  manageableAccounts: Account[];
}

export function AccountSelector({
  currentAccount,
  manageableAccounts,
}: AccountSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Extract current view from pathname (last segment)
  const pathParts = pathname.split("/");
  const currentView = pathParts[pathParts.length - 1];

  return (
    <Box
      style={{
        borderBottom: "1px solid var(--gray-6)",
        paddingBottom: "16px",
        marginBottom: "24px",
      }}
    >
      <Flex justify="between" align="center">
        {/* Left side - Account info and switcher */}
        <Flex align="center" gap="4">
          <DropdownMenu.Root open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenu.Trigger>
              <Flex align="center" gap="2" style={{ cursor: "pointer" }}>
                <AvatarLinkCompact
                  account={currentAccount}
                  link={false}
                  showHoverCard={false}
                />
                <ChevronIcon isOpen={isOpen} />
              </Flex>
            </DropdownMenu.Trigger>

            <DropdownMenu.Content>
              {manageableAccounts.map((account) => (
                <Link
                  href={editAccountViewUrl(account.account_id, currentView)}
                  onClick={() => setIsOpen(false)}
                  key={account.account_id}
                >
                  <Box my="1">
                    <DropdownMenu.Item
                      style={{
                        cursor: "pointer",
                        backgroundColor:
                          account.account_id === currentAccount.account_id
                            ? "var(--accent-3)"
                            : undefined,
                        transition: "background-color 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        if (account.account_id !== currentAccount.account_id) {
                          e.currentTarget.style.backgroundColor =
                            "var(--accent-4)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (account.account_id !== currentAccount.account_id) {
                          e.currentTarget.style.backgroundColor = "transparent";
                        }
                      }}
                    >
                      <AvatarLinkCompact
                        account={account}
                        link={false}
                        showHoverCard={false}
                      />
                    </DropdownMenu.Item>
                  </Box>
                </Link>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        </Flex>

        {/* Right side - Link to profile */}
        <RadixLink
          href={accountUrl(currentAccount.account_id)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            textDecoration: "none",
            color: "var(--gray-11)",
            fontSize: "14px",
          }}
        >
          <Text size="2">View Profile</Text>
          <ExternalLinkIcon width="14" height="14" />
        </RadixLink>
      </Flex>
    </Box>
  );
}

function getAccountInitials(account: Account) {
  return account.name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
