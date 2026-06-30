"use client";
import { useState, type CSSProperties } from "react";
import { Flex, DropdownMenu, Text, Box } from "@radix-ui/themes";
import { ChevronDownIcon, PlusIcon } from "@radix-ui/react-icons";
import styles from "./Navigation.module.css";
import {
  LOGGER,
  CONFIG,
  accountUrl,
  editAccountProfileUrl,
  newOrganizationUrl,
  newProductUrl,
  productUrl,
  productListUrl,
} from "@/lib";
import { DropdownSection, DropdownSubmenu } from "./DropdownSection";
import { isAdmin, isAuthorized } from "@/lib/api/authz";
import { ADMIN_TOOLS } from "@/components/features/admin/tools";
import { Actions, UserSession } from "@/types";
import { ProfileAvatar } from "@/components/features/profiles/ProfileAvatar";
import { UploadBadge } from "@/components/features/uploader/UploadBadge";
import { UploadsSubmenu } from "@/components/features/uploader/UploadsSubmenu";
import { Skeleton } from "@/components/core/Skeleton";

export function AccountDropdownSkeleton() {
  return (
    <Flex align="center" gap="2">
      <Skeleton width={36} height={36} className="rounded-full" />
      <Skeleton width={96} height={32} />
    </Flex>
  );
}

// Cap long org/product names so a single entry can't blow out the menu width.
const truncateStyle: CSSProperties = {
  display: "block",
  maxWidth: 220,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

export interface DropdownOrganization {
  account_id: string;
  name: string;
}

export interface DropdownProduct {
  account_id: string;
  product_id: string;
  title: string;
}

export function AccountDropdown({
  session,
  organizations = [],
  products = [],
}: {
  session: UserSession;
  organizations?: DropdownOrganization[];
  products?: DropdownProduct[];
}) {
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
          <Box style={{ position: "relative" }}>
            <ProfileAvatar account={session.account!} size="2" />
            <UploadBadge />
          </Box>
          <Box display={{ initial: "none", sm: "block" }}>
            <Text>{session.account!.name}</Text>
          </Box>
          <ChevronDownIcon
            className={styles.chevron}
            data-state={isOpen ? "open" : "closed"}
          />
        </Flex>
      </DropdownMenu.Trigger>

      <DropdownMenu.Content>
        <DropdownSubmenu
          label="Profile"
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
        <DropdownSubmenu
          label="Organizations"
          items={organizations.slice(0, 5).map((org) => ({
            href: accountUrl(org.account_id),
            children: <span style={truncateStyle}>{org.name}</span>,
          }))}
          actions={[
            {
              href: newOrganizationUrl(session.account!.account_id),
              children: (
                <>
                  <PlusIcon />
                  Create Organization
                </>
              ),
              condition: isAuthorized(session, "*", Actions.CreateAccount),
            },
          ]}
        />
        <DropdownSubmenu
          label="Products"
          items={products.slice(0, 5).map((product) => ({
            href: productUrl(product.account_id, product.product_id),
            children: <span style={truncateStyle}>{product.title}</span>,
          }))}
          actions={[
            { href: productListUrl(), children: "All Products" },
            {
              href: newProductUrl(),
              children: (
                <>
                  <PlusIcon />
                  Create Product
                </>
              ),
              condition: isAuthorized(session, "*", Actions.CreateRepository),
            },
          ]}
        />
        <DropdownSubmenu
          label="Admin"
          condition={isAdmin(session)}
          items={ADMIN_TOOLS.map((tool) => ({
            href: tool.href,
            children: tool.name,
          }))}
        />
        <UploadsSubmenu />
        <DropdownMenu.Separator />
        <DropdownSection
          items={[
            {
              onClick: handleLogout,
              children: "Logout",
              color: "red",
            },
          ]}
          showSeparator={false}
        />
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}
