"use client";
import { Flex, DropdownMenu, Text, Box, Button } from "@radix-ui/themes";
import Link from "next/link";
import { useState } from "react";
import { ProfileAvatar } from "@/components/features/profiles/ProfileAvatar";
import { ChevronDownIcon } from "@radix-ui/react-icons";
import styles from "./Navigation.module.css";
import { Account } from "@/types/account";
import { Skeleton } from "../core/Skeleton";
import { CONFIG } from "@/lib/config";
import { LOGGER } from "@/lib";

export function AccountDropdownSkeleton() {
  return (
    <Flex align="center" gap="2">
      <Skeleton width={36} height={36} className="rounded-full" />
      <Skeleton width={96} height={32} />
    </Flex>
  );
}

export function AccountDropdown({ account }: { account: Account }) {
  const [isOpen, setIsOpen] = useState(false);
  const handleLogout = async () => {
    const response = await fetch(CONFIG.auth.routes.logout, {
      method: "GET",
      credentials: "include",
    });
    if (!response.ok) {
      LOGGER.error(
        `Failed to logout: ${response.status} ${response.statusText}`,
        {
          operation: "logout",
          metadata: { response },
        }
      );
      return;
    }
    const { logout_url } = await response.json();
    window.location.href = logout_url;
  };

  return (
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
          <Link href={`/${account.account_id}/edit`}>Edit Profile</Link>
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
          <Text onClick={handleLogout}>Logout</Text>
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}
