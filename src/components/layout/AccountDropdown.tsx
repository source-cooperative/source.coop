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

export interface DropdownOrganization {
  account_id: string;
  name: string;
}

export interface DropdownProduct {
  account_id: string;
  product_id: string;
  title: string;
}

export interface DropdownInvitation {
  href: string;
  label: string;
}

export function AccountDropdown({
  session,
  organizations = [],
  products = [],
  pendingInvitations = [],
}: {
  session: UserSession;
  organizations?: DropdownOrganization[];
  products?: DropdownProduct[];
  pendingInvitations?: DropdownInvitation[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const hasInvitations = pendingInvitations.length > 0;

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
          items={pendingInvitations.slice(0, 5).map((invitation) => ({
            href: invitation.href,
            children: <span style={entityNameStyle}>{invitation.label}</span>,
          }))}
        />
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
          label="Products"
          items={products.slice(0, 20).map((product) => ({
            href: productUrl(product.account_id, product.product_id),
            children: <span style={entityNameStyle}>{product.title}</span>,
          }))}
          actions={[
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
          label="Organizations"
          items={organizations.slice(0, 20).map((org) => ({
            href: accountUrl(org.account_id),
            children: <span style={entityNameStyle}>{org.name}</span>,
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
