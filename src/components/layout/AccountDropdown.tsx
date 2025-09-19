"use client";
import { Flex, DropdownMenu, Text } from "@radix-ui/themes";
import { useState } from "react";
import { ProfileAvatar } from "@/components/features/profiles/ProfileAvatar";
import { ChevronDownIcon } from "@radix-ui/react-icons";
import styles from "./Navigation.module.css";
import { UserSession } from "@/types/session";
import { Skeleton } from "../core/Skeleton";
import { CONFIG } from "@/lib/config";
import { LOGGER } from "@/lib";
import { DropdownSection } from "./DropdownSection";
import { isAuthorized } from "@/lib/api/authz";
import { Actions } from "@/types";
import {
  accountUrl,
  editAccountProfileUrl,
  newOrganizationUrl,
  newProductUrl,
} from "@/lib/urls";

export function AccountDropdownSkeleton() {
  return (
    <Flex align="center" gap="2">
      <Skeleton width={36} height={36} className="rounded-full" />
      <Skeleton width={96} height={32} />
    </Flex>
  );
}

export function AccountDropdown({ session }: { session: UserSession }) {
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
          <ProfileAvatar account={session.account!} size="2" />
          <Text>{session.account!.name}</Text>
          <ChevronDownIcon
            className={styles.chevron}
            data-state={isOpen ? "open" : "closed"}
          />
        </Flex>
      </DropdownMenu.Trigger>

      <DropdownMenu.Content>
        <DropdownSection
          label="Account"
          items={[
            {
              href: accountUrl(session.account!.account_id),
              children: "View Profile",
            },
            {
              href: editAccountProfileUrl(session.account!.account_id),
              children: "Edit Profile",
            },
          ]}
        />
        <DropdownSection
          label="Organizations"
          items={[
            {
              href: newOrganizationUrl(session.account!.account_id),
              children: "Create Organization",
              condition: isAuthorized(session, "*", Actions.CreateAccount),
            },
          ]}
        />
        <DropdownSection
          label="Products"
          items={[
            {
              href: newProductUrl(),
              children: "Create Product",
              condition: isAuthorized(session, "*", Actions.CreateRepository),
            },
          ]}
        />
        <DropdownSection
          items={[
            {
              onClick: handleLogout,
              children: <Text>Logout</Text>,
              color: "red",
            },
          ]}
          showSeparator={false}
        />
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}
