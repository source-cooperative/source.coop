"use client";
import { useState, type CSSProperties } from "react";
import { Flex, DropdownMenu, Text, Box } from "@radix-ui/themes";
import { ChevronDownIcon, PlusIcon } from "@radix-ui/react-icons";
import { useTranslations } from "next-intl";
import styles from "./Navigation.module.css";
import {
  accountUrl,
  newOrganizationUrl,
  newProductUrl,
  productUrl,
} from "@/lib";
import { DropdownSection, DropdownSubmenu } from "./DropdownSection";
import { logout } from "./logout";
import { canCreateProductForAccount, isAdmin, isAuthorized } from "@/lib/api/authz";
import { ADMIN_TOOLS } from "@/components/features/admin/tools";
import { Account, Actions, UserSession } from "@/types";
import { ProfileAvatar } from "@/components/features/profiles/ProfileAvatar";
import { ActivityBadge } from "@/components/features/uploader/ActivityBadge";
import { ActivitySubmenu } from "@/components/features/uploader/ActivitySubmenu";
import { Skeleton } from "@/components/core/Skeleton";

export function AccountDropdownSkeleton() {
  return (
    <Flex align="center" gap="2">
      <Skeleton width={36} height={36} className="rounded-full" />
      <Skeleton width={96} height={32} />
    </Flex>
  );
}

// Cap an account/product/invitation name at a fixed width so it ellipsizes
// (text-overflow needs a definite width) instead of widening the menu.
const entityNameStyle: CSSProperties = {
  display: "block",
  maxWidth: 180,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

export interface DropdownAccountProduct {
  product_id: string;
  title: string;
}

// An account the user can browse from the menu: themselves or an org they
// belong to, plus that account's products. The full account drives the avatar.
export interface DropdownAccount {
  account: Account;
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
  const t = useTranslations("AccountDropdown");
  const tTools = useTranslations("AdminTools");
  const [isOpen, setIsOpen] = useState(false);
  const hasInvitations = pendingInvitations.length > 0;
  const canCreateOrg = isAuthorized(session, "*", Actions.CreateAccount);

  return (
    <DropdownMenu.Root open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenu.Trigger>
        <Flex align="center" gap="2" style={{ cursor: "pointer" }}>
          <Box style={{ position: "relative" }}>
            <ProfileAvatar account={session.account!} size="2" />
            <ActivityBadge />
            {hasInvitations && (
              <Box
                aria-label={t("pendingInvitations")}
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
        {/* One submenu per account (you + your orgs): an avatar-labelled trigger
            linking to the account page, then that account's products. */}
        {accounts.map(({ account, isSelf, products }) => {
          const canCreateProduct = canCreateProductForAccount(session, account);
          return (
            <DropdownSubmenu
              key={account.account_id}
              label={
                <Flex align="center" gap="2">
                  <ProfileAvatar account={account} size="1" />
                  <Text style={entityNameStyle}>{account.name}</Text>
                  {isSelf && (
                    <Text size="1" color="gray">
                      {t("you")}
                    </Text>
                  )}
                </Flex>
              }
              items={[
                {
                  href: accountUrl(account.account_id),
                  children: isSelf ? t("viewProfile") : t("viewOrganization"),
                },
              ]}
              actionsLabel={t("products")}
              actions={[
                ...(products.length > 0
                  ? products.slice(0, 20).map((product) => ({
                      href: productUrl(account.account_id, product.product_id),
                      children: (
                        <Text
                          className={styles.productName}
                          style={entityNameStyle}
                          weight="medium"
                        >
                          {product.title}
                        </Text>
                      ),
                    }))
                  : [
                      {
                        children: t("noProducts"),
                        color: "gray" as const,
                        disabled: true,
                      },
                    ]),
                // Create a product for this account, at the bottom of its list,
                // set off from the products above by a divider.
                {
                  separator: true,
                  href: canCreateProduct
                    ? newProductUrl(account.account_id)
                    : undefined,
                  disabled: !canCreateProduct,
                  tooltip: canCreateProduct
                    ? undefined
                    : t("noCreateProductPermission"),
                  children: (
                    <>
                      <PlusIcon />
                      {t("newProduct")}
                    </>
                  ),
                },
              ]}
            />
          );
        })}

        <DropdownMenu.Separator />
        {/* New organization, under the list of accounts you belong to.
            Always shown; disabled with a tooltip when unauthorized. */}
        <DropdownSection
          showSeparator={false}
          items={[
            {
              href: canCreateOrg
                ? newOrganizationUrl(session.account!.account_id)
                : undefined,
              disabled: !canCreateOrg,
              tooltip: canCreateOrg
                ? undefined
                : t("noCreateOrgPermission"),
              children: (
                <>
                  <PlusIcon />
                  {t("newOrganization")}
                </>
              ),
            },
          ]}
        />

        <DropdownMenu.Separator />
        {/* Invitations — always shown so the user can check; a grey empty state
            when there are none, a red dot on the label when there are. */}
        <DropdownSubmenu
          label={
            <span
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              {t("invitations")}
              {hasInvitations && <span className={styles.mobileDot} />}
            </span>
          }
          items={
            hasInvitations
              ? pendingInvitations.slice(0, 20).map((invitation) => ({
                  href: invitation.href,
                  children: (
                    <Text style={entityNameStyle}>{invitation.label}</Text>
                  ),
                }))
              : [
                  {
                    children: t("noInvitations"),
                    color: "gray" as const,
                    disabled: true,
                  },
                ]
          }
        />
        <DropdownSubmenu
          label={t("admin")}
          condition={isAdmin(session)}
          items={ADMIN_TOOLS.map((tool) => ({
            href: tool.href,
            children: tTools(`${tool.key}.name`),
          }))}
        />
        <ActivitySubmenu />
        <DropdownMenu.Separator />
        <DropdownSection
          items={[
            {
              onClick: logout,
              children: t("logout"),
              color: "red",
            },
          ]}
          showSeparator={false}
        />
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}
