"use client";

import { ReactNode } from "react";
import { Box, Flex, Text, Separator } from "@radix-ui/themes";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { PersonIcon, LockClosedIcon } from "@radix-ui/react-icons";
import { Account } from "@/types";
import { SettingsHeader } from "./SettingsHeader";
import styles from "./SettingsLayout.module.css";

interface SettingsMenuItem {
  id: string;
  label: string;
  href: string;
  icon?: ReactNode;
  condition?: boolean;
}

interface SettingsLayoutProps {
  children: ReactNode;
  accountId: string;
  accountType: "individual" | "organization";
  canReadAccount: boolean;
  canReadMembership: boolean;
  currentAccount: Account;
  manageableAccounts: Account[];
}

export function SettingsLayout({
  children,
  accountId,
  accountType,
  canReadAccount,
  canReadMembership,
  currentAccount,
  manageableAccounts,
}: SettingsLayoutProps) {
  const pathname = usePathname();

  const menuItems: SettingsMenuItem[] = [
    {
      id: "profile",
      label: "Public Profile",
      href: `/edit/account/${accountId}/profile`,
      icon: <PersonIcon width="16" height="16" />,
      condition: canReadAccount,
    },
    {
      id: "security",
      label: "Security",
      href: `/edit/account/${accountId}/security`,
      icon: <LockClosedIcon width="16" height="16" />,
      condition: canReadAccount,
    },
    ...(accountType === "organization"
      ? [
          {
            id: "memberships",
            label: "Memberships",
            href: `/edit/account/${accountId}/memberships`,
            icon: <PersonIcon width="16" height="16" />,
            condition: canReadMembership,
          },
        ]
      : []),
  ];

  const filteredMenuItems = menuItems.filter((item) => item.condition);

  return (
    <Box>
      {/* Header with account info and switcher */}
      <SettingsHeader
        currentAccount={currentAccount}
        manageableAccounts={manageableAccounts}
      />

      <Flex gap="6" className={styles.settingsLayout}>
        {/* Left sidebar menu */}
        <Box
          className={styles.settingsSidebar}
          style={{ minWidth: "200px", maxWidth: "250px" }}
        >
          <Box>
            <Text size="2" weight="bold" color="gray" mb="3">
              Settings
            </Text>
            <Flex direction="column" gap="1">
              {filteredMenuItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={`${styles.settingsMenuItem} ${
                      isActive ? styles.active : ""
                    }`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      textDecoration: "none",
                      color: isActive ? "var(--accent-11)" : "var(--gray-11)",
                      backgroundColor: isActive
                        ? "var(--accent-3)"
                        : "transparent",
                      fontWeight: isActive ? "500" : "400",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {item.icon}
                    <Text size="2">{item.label}</Text>
                  </Link>
                );
              })}
            </Flex>
          </Box>
        </Box>

        <Separator orientation="vertical" />

        {/* Right content area */}
        <Box
          className={styles.settingsContent}
          style={{ flex: 1, minWidth: 0 }}
        >
          {children}
        </Box>
      </Flex>
    </Box>
  );
}
