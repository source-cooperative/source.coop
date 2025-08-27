"use client";
import { Flex, DropdownMenu, Text } from "@radix-ui/themes";
import Link from "next/link";
import { useState } from "react";
import { ProfileAvatar } from "@/components/features/profiles/ProfileAvatar";
import { ChevronDownIcon } from "@radix-ui/react-icons";
import { Account } from "@/types/account";

export function AccountDropdown({ account }: { account: Account }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <DropdownMenu.Root open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenu.Trigger>
        <Flex align="center" gap="2" style={{ cursor: "pointer" }}>
          <ProfileAvatar account={account} size="2" />
          <Text>{account.name}</Text>
          <ChevronDownIcon
            style={{
              transition: "transform 0.3s ease",
              transform: isOpen ? "rotate(180deg)" : "rotate(0deg)"
            }}
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
          <Link className="underline block w-full" href={`/auth/logout`}>
            Logout
          </Link>
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}
