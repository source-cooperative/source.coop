"use client";

import { useState } from "react";
import {
  Box,
  Flex,
  Text,
  Avatar,
  DropdownMenu,
  Button,
  Link as RadixLink,
} from "@radix-ui/themes";
import { ChevronDownIcon, ExternalLinkIcon } from "@radix-ui/react-icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Account } from "@/types";

interface SettingsHeaderProps {
  currentAccount: Account;
  manageableAccounts: Account[];
  currentSettingType: string;
}

export function SettingsHeader({
  currentAccount,
  manageableAccounts,
  currentSettingType,
}: SettingsHeaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const getAccountTypeLabel = (account: Account) => {
    return account.type === "organization" ? "Organization" : "Individual";
  };

  const getAccountInitials = (account: Account) => {
    return account.name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

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
          <Avatar
            size="3"
            fallback={getAccountInitials(currentAccount)}
            style={{
              backgroundColor: "var(--accent-9)",
              color: "white",
              borderRadius: "50%",
            }}
          />
          <Box>
            <Flex align="center" gap="2" mb="1">
              <Text size="4" weight="bold">
                {currentAccount.name}
              </Text>
              <Text size="2" color="gray">
                {getAccountTypeLabel(currentAccount)}
              </Text>
            </Flex>
            <Text size="2" color="gray">
              @{currentAccount.account_id}
            </Text>
          </Box>

          {manageableAccounts.length > 1 && (
            <DropdownMenu.Root open={isOpen} onOpenChange={setIsOpen}>
              <DropdownMenu.Trigger>
                <Button variant="ghost" size="2">
                  <ChevronDownIcon width="16" height="16" />
                </Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content>
                {manageableAccounts.map((account) => (
                  <Link
                    href={`/edit/${currentSettingType}/${account.account_id}`}
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
                          if (
                            account.account_id !== currentAccount.account_id
                          ) {
                            e.currentTarget.style.backgroundColor =
                              "var(--accent-4)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (
                            account.account_id !== currentAccount.account_id
                          ) {
                            e.currentTarget.style.backgroundColor =
                              "transparent";
                          }
                        }}
                      >
                        <Flex align="center" gap="3">
                          <Avatar
                            size="2"
                            fallback={getAccountInitials(account)}
                            style={{
                              backgroundColor: "var(--accent-9)",
                              color: "white",
                              borderRadius: "50%",
                            }}
                          />
                          <Box>
                            <Text size="2" weight="medium">
                              {account.name}
                            </Text>
                            <Text size="1" color="gray">
                              @{account.account_id}
                            </Text>
                          </Box>
                        </Flex>
                      </DropdownMenu.Item>
                    </Box>
                  </Link>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu.Root>
          )}
        </Flex>

        {/* Right side - Link to profile */}
        <RadixLink
          href={`/${currentAccount.account_id}`}
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
