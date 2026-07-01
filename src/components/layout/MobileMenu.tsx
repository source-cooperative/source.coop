"use client";
import { useState, type ReactNode } from "react";
import NextLink from "next/link";
import { Dialog, Flex, IconButton, Text } from "@radix-ui/themes";
import {
  HamburgerMenuIcon,
  Cross1Icon,
  ChevronDownIcon,
  PlusIcon,
} from "@radix-ui/react-icons";
import styles from "./Navigation.module.css";
import {
  accountUrl,
  productUrl,
  productListUrl,
  newProductUrl,
  newOrganizationUrl,
} from "@/lib";
import { isAdmin, isAuthorized } from "@/lib/api/authz";
import { ADMIN_TOOLS } from "@/components/features/admin/tools";
import { Actions, UserSession } from "@/types";
import { ProfileAvatar } from "@/components/features/profiles/ProfileAvatar";
import { logout } from "./logout";
import type { DropdownAccount, DropdownInvitation } from "./AccountDropdown";

export function MobileMenu({
  session,
  accounts,
  pendingInvitations,
}: {
  session: UserSession;
  accounts: DropdownAccount[];
  pendingInvitations: DropdownInvitation[];
}) {
  const [open, setOpen] = useState(false);
  // Single-open accordion: one expanded section at a time (account id / "…").
  const [expanded, setExpanded] = useState<string | null>(null);

  const canCreateProduct = isAuthorized(session, "*", Actions.CreateRepository);
  const canCreateOrg = isAuthorized(session, "*", Actions.CreateAccount);
  const hasInvitations = pendingInvitations.length > 0;

  const close = () => setOpen(false);
  const toggle = (key: string) =>
    setExpanded((cur) => (cur === key ? null : key));

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger>
        <IconButton variant="ghost" color="gray" size="3" aria-label="Open menu">
          <HamburgerMenuIcon width="22" height="22" />
        </IconButton>
      </Dialog.Trigger>
      {/* Themed Dialog re-applies the theme inside the portal (so the sheet has
          a background and the avatars are sized). Content is styled full-screen. */}
      <Dialog.Content
        className={styles.mobileSheet}
        maxWidth="100vw"
        aria-describedby={undefined}
      >
        <Flex align="center" justify="between" px="4" py="3">
          <Dialog.Title size="4" mb="0">
            Menu
          </Dialog.Title>
          <Dialog.Close>
            <IconButton
              variant="ghost"
              color="gray"
              size="3"
              aria-label="Close menu"
            >
              <Cross1Icon width="20" height="20" />
            </IconButton>
          </Dialog.Close>
        </Flex>
        <div className={styles.mobileDivider} />

        <NextLink
          href={productListUrl()}
          className={styles.mobileRow}
          onClick={close}
        >
          Products
        </NextLink>
        <div className={styles.mobileDivider} />

        {accounts.map(({ account, isSelf, products }) => (
          <Section
            key={account.account_id}
            expanded={expanded === account.account_id}
            onToggle={() => toggle(account.account_id)}
            label={
              <Flex align="center" gap="2">
                <ProfileAvatar account={account} size="1" />
                <Text>{account.name}</Text>
                {isSelf && (
                  <Text size="1" color="gray">
                    you
                  </Text>
                )}
              </Flex>
            }
          >
            <Row href={accountUrl(account.account_id)} onNavigate={close} indent>
              {isSelf ? "View profile" : "View organization"}
            </Row>
            {products.length > 0 ? (
              products.map((p) => (
                <Row
                  key={p.product_id}
                  href={productUrl(account.account_id, p.product_id)}
                  onNavigate={close}
                  indent
                >
                  {p.title}
                </Row>
              ))
            ) : (
              <MutedRow indent>No products yet</MutedRow>
            )}
          </Section>
        ))}

        {(canCreateProduct || canCreateOrg) && (
          <div className={styles.mobileDivider} />
        )}
        {canCreateProduct && (
          <Row href={newProductUrl()} onNavigate={close} icon={<PlusIcon />}>
            New product
          </Row>
        )}
        {canCreateOrg && (
          <Row
            href={newOrganizationUrl(session.account!.account_id)}
            onNavigate={close}
            icon={<PlusIcon />}
          >
            New organization
          </Row>
        )}

        <div className={styles.mobileDivider} />
        <Section
          expanded={expanded === "invitations"}
          onToggle={() => toggle("invitations")}
          label={
            <Flex align="center" gap="2">
              <Text>Invitations</Text>
              {hasInvitations && <span className={styles.mobileDot} />}
            </Flex>
          }
        >
          {hasInvitations ? (
            pendingInvitations.map((inv, i) => (
              <Row key={i} href={inv.href} onNavigate={close} indent>
                {inv.label}
              </Row>
            ))
          ) : (
            <MutedRow indent>No pending invitations</MutedRow>
          )}
        </Section>

        {isAdmin(session) && (
          <Section
            expanded={expanded === "admin"}
            onToggle={() => toggle("admin")}
            label={<Text>Admin</Text>}
          >
            {ADMIN_TOOLS.map((tool) => (
              <Row key={tool.href} href={tool.href} onNavigate={close} indent>
                {tool.name}
              </Row>
            ))}
          </Section>
        )}

        <div className={styles.mobileDivider} />
        <button
          type="button"
          className={styles.mobileRow}
          style={{ color: "var(--red-11)" }}
          onClick={() => {
            close();
            logout();
          }}
        >
          Log out
        </button>
      </Dialog.Content>
    </Dialog.Root>
  );
}

function Row({
  href,
  onNavigate,
  icon,
  indent,
  children,
}: {
  href: string;
  onNavigate: () => void;
  icon?: ReactNode;
  indent?: boolean;
  children: ReactNode;
}) {
  return (
    <NextLink
      href={href}
      onClick={onNavigate}
      className={`${styles.mobileRow}${indent ? ` ${styles.mobileRowIndent}` : ""}`}
    >
      {icon}
      {children}
    </NextLink>
  );
}

function MutedRow({
  indent,
  children,
}: {
  indent?: boolean;
  children: ReactNode;
}) {
  return (
    <span
      className={`${styles.mobileRow} ${styles.mobileRowMuted}${indent ? ` ${styles.mobileRowIndent}` : ""}`}
    >
      {children}
    </span>
  );
}

function Section({
  expanded,
  onToggle,
  label,
  children,
}: {
  expanded: boolean;
  onToggle: () => void;
  label: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <button
        type="button"
        className={styles.mobileRow}
        onClick={onToggle}
        aria-expanded={expanded}
      >
        {label}
        <ChevronDownIcon
          className={`${styles.mobileRowChevron}${expanded ? ` ${styles.mobileRowChevronOpen}` : ""}`}
        />
      </button>
      {expanded && <div>{children}</div>}
    </>
  );
}
