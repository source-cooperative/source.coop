"use client";

import { useState } from "react";
import { Flex, DropdownMenu } from "@radix-ui/themes";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Account } from "@/types";
import { AvatarLinkCompact } from "@/components/core/AccountLinks";
import { editAccountViewUrl } from "@/lib/urls";
import { ChevronIcon } from "@/components/icons";
import { dropdownMenuLinkStyle } from "@/components/layout/DropdownSection";

interface AccountSelectorProps {
  currentAccount: Account;
  manageableAccounts: Account[];
  linkToSameView?: boolean;
}

export function AccountSelector({
  currentAccount,
  manageableAccounts,
  linkToSameView = false,
}: AccountSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  return (
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

      <DropdownMenu.Content variant="soft">
        {manageableAccounts.map((account) => {
          const href = editAccountViewUrl(
            account.account_id,
            // We want to send user to the same view they are in, but for different account
            linkToSameView ? pathname.split("/").pop()! : ""
          );
          return (
            <DropdownMenu.Item
              key={account.account_id}
              onSelect={() => router.push(href)}
            >
              <Link href={href} style={dropdownMenuLinkStyle}>
                <AvatarLinkCompact
                  account={account}
                  link={false}
                  showHoverCard={false}
                  size="1"
                />
              </Link>
            </DropdownMenu.Item>
          );
        })}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}
