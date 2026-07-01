"use client";
import { useState, type CSSProperties } from "react";
import { Flex, DropdownMenu, Text, Box } from "@radix-ui/themes";
import { ChevronDownIcon, PlusIcon } from "@radix-ui/react-icons";
import styles from "./Navigation.module.css";
import {
  LOGGER,
  CONFIG,
  accountUrl,
  newOrganizationUrl,
  newProductUrl,
  productUrl,
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

// Org/product/invitation names are user data, not menu commands — render them
// in a monospace face so they read distinctly from the surrounding options, and
// cap the width so one long name can't blow out the menu.
const entityNameStyle: CSSProperties = {
  display: "block",
  maxWidth: 220,
  fontFamily: "var(--code-font-family, monospace)",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

// Red dot rendered inline next to the "Invitations" label.
const inlineDotStyle: CSSProperties = {
  display: "inline-block",
  width: 8,
  height: 8,
  borderRadius: "50%",
  backgroundColor: "var(--red-9)",
};

export interface DropdownAccountProduct {
  product_id: string;
  title: string;
}

// An account the user can browse from the menu: themselves or an org they
// belong to, plus that account's products.
export interface DropdownAccount {
  account_id: string;
  isSelf: boolean;
  products: DropdownAccountProduct[];
}

export interface DropdownInvitation {
  href: string;
  label: string;
}

export function AccountDropdown({
  session,
  accounts = [],
  pendingInvitations = [],
}: {
  session: UserSession;
  accounts?: DropdownAccount[];
  pendingInvitations?: DropdownInvitation[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const hasInvitations = pendingInvitations.length > 0;
  const canCreateProduct = isAuthorized(session, "*", Actions.CreateRepository);
  const canCreateOrg = isAuthorized(session, "*", Actions.CreateAccount);
  const canCreate = canCreateProduct || canCreateOrg;

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
            {hasInvitations && (
              <Box
                aria-label="You have pending invitations"
                style={{
                  position: "absolute",
                  bottom: -1,
                  right: -1,
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  backgroundColor: "var(--red-9)",
                  border: "2px solid var(--color-background)",
                }}
              />
            )}
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
          condition={hasInvitations}
          label={
            <span
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              Invitations
              <span style={inlineDotStyle} />
            </span>
          }
          items={pendingInvitations.slice(0, 20).map((invitation) => ({
            href: invitation.href,
            children: <span style={entityNameStyle}>{invitation.label}</span>,
          }))}
        />
        {hasInvitations && <DropdownMenu.Separator />}

        {/* One submenu per account (you + your orgs): a link to the account
            page, then that account's products. */}
        {accounts.map((account) => (
          <DropdownSubmenu
            key={account.account_id}
            label={
              <span
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <span style={entityNameStyle}>{account.account_id}</span>
                {account.isSelf && (
                  <Text size="1" color="gray">
                    you
                  </Text>
                )}
              </span>
            }
            items={[
              {
                href: accountUrl(account.account_id),
                children: account.isSelf
                  ? "View profile"
                  : "View organization",
              },
            ]}
            actions={account.products.slice(0, 20).map((product) => ({
              href: productUrl(account.account_id, product.product_id),
              children: <span style={entityNameStyle}>{product.title}</span>,
            }))}
          />
        ))}

        {canCreate && <DropdownMenu.Separator />}
        <DropdownSection
          showSeparator={false}
          items={[
            {
              href: newProductUrl(),
              children: (
                <>
                  <PlusIcon />
                  New product
                </>
              ),
              condition: canCreateProduct,
            },
            {
              href: newOrganizationUrl(session.account!.account_id),
              children: (
                <>
                  <PlusIcon />
                  New organization
                </>
              ),
              condition: canCreateOrg,
            },
          ]}
        />

        {isAdmin(session) && <DropdownMenu.Separator />}
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
