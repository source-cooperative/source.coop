"use client";
import { useState, type ReactNode } from "react";
import NextLink from "next/link";
import { Button, Dialog, Flex, IconButton, Text } from "@radix-ui/themes";
import {
  HamburgerMenuIcon,
  Cross1Icon,
  ChevronDownIcon,
  PlusIcon,
  DashIcon,
} from "@radix-ui/react-icons";
import styles from "./Navigation.module.css";
import {
  accountUrl,
  productUrl,
  productListUrl,
  newProductUrl,
  newOrganizationUrl,
  loginUrl,
  docsUrl,
} from "@/lib";
import { isAdmin, isAuthorized } from "@/lib/api/authz";
import { ADMIN_TOOLS } from "@/components/features/admin/tools";
import { Actions, UserSession } from "@/types";
import { ProfileAvatar } from "@/components/features/profiles/ProfileAvatar";
import { logout } from "./logout";
import type { DropdownAccount, DropdownInvitation } from "./AccountDropdown";

// Hamburger + full-screen sheet shell (themed Radix Dialog re-applies the theme
// inside the portal). Children receive a `close` to dismiss on navigation.
function MobileMenuSheet({
  children,
}: {
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger>
        <IconButton variant="ghost" color="gray" size="3" aria-label="Open menu">
          <HamburgerMenuIcon width="22" height="22" />
        </IconButton>
      </Dialog.Trigger>
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
        {children(() => setOpen(false))}
      </Dialog.Content>
    </Dialog.Root>
  );
}

export function MobileMenu({
  session,
  accounts,
  pendingInvitations,
}: {
  session: UserSession;
  accounts: DropdownAccount[];
  pendingInvitations: DropdownInvitation[];
}) {
  // Single-open accordion: one expanded section at a time (account id / "…").
  const [expanded, setExpanded] = useState<string | null>(null);
  const canCreateProduct = isAuthorized(session, "*", Actions.CreateRepository);
  const canCreateOrg = isAuthorized(session, "*", Actions.CreateAccount);
  const hasInvitations = pendingInvitations.length > 0;
  const toggle = (key: string) =>
    setExpanded((cur) => (cur === key ? null : key));

  return (
    <MobileMenuSheet>
      {(close) => (
        <>
          <NextLink
            href={productListUrl()}
            className={styles.mobileRow}
            onClick={close}
          >
            Products
          </NextLink>
          <a href={docsUrl()} className={styles.mobileRow} onClick={close}>
            Docs
          </a>
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
              <Row
                href={accountUrl(account.account_id)}
                onNavigate={close}
                indent
              >
                {isSelf ? "View profile" : "View organization"}
              </Row>
              {products.length > 0 ? (
                products.map((p) => (
                  <Row
                    key={p.product_id}
                    href={productUrl(account.account_id, p.product_id)}
                    onNavigate={close}
                    indent
                    icon={<DashIcon />}
                  >
                    {p.title}
                  </Row>
                ))
              ) : (
                <MutedRow indent>No products yet</MutedRow>
              )}
              {canCreateProduct && (
                <Row
                  href={newProductUrl(account.account_id)}
                  onNavigate={close}
                  indent
                  icon={<PlusIcon />}
                >
                  New product
                </Row>
              )}
            </Section>
          ))}

          {canCreateOrg && <div className={styles.mobileDivider} />}
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
        </>
      )}
    </MobileMenuSheet>
  );
}

/** Logged-out: the same hamburger sheet with just Products + login. */
export function LoggedOutMobileMenu({ returnTo }: { returnTo?: string }) {
  return (
    <MobileMenuSheet>
      {(close) => (
        <>
          <NextLink
            href={productListUrl()}
            className={styles.mobileRow}
            onClick={close}
          >
            Products
          </NextLink>
          <a href={docsUrl()} className={styles.mobileRow} onClick={close}>
            Docs
          </a>
          <div className={styles.mobileDivider} />
          <Flex p="4">
            <Button asChild size="3" style={{ width: "100%" }}>
              <NextLink href={loginUrl(returnTo)} onClick={close}>
                Log In / Register
              </NextLink>
            </Button>
          </Flex>
        </>
      )}
    </MobileMenuSheet>
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
