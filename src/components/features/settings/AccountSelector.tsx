"use client";

import { useState } from "react";
import { Flex, DropdownMenu } from "@radix-ui/themes";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Account } from "@/types";
import { AvatarLinkCompact } from "@/components";
import { editAccountViewUrl } from "@/lib/urls";
import { ChevronIcon } from "@/components/icons";

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
        {manageableAccounts.map((account) => (
          <DropdownMenu.Item key={account.account_id}>
            <Link
              href={editAccountViewUrl(
                account.account_id,
                // We want to send user to the same view they are in, but for different account
                linkToSameView ? pathname.split("/").pop()! : ""
              )}
              onClick={() => setIsOpen(false)}
            >
              <AvatarLinkCompact
                account={account}
                link={false}
                showHoverCard={false}
                size="1"
              />
            </Link>
          </DropdownMenu.Item>
        ))}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}
