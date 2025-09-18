"use client";

import { ReactNode } from "react";
import { Box, Flex, Text, Separator } from "@radix-ui/themes";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PersonIcon, LockClosedIcon } from "@radix-ui/react-icons";
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
}

export function SettingsLayout({
  children,
  accountId,
  accountType,
  canReadAccount,
  canReadMembership,
}: SettingsLayoutProps) {
  const pathname = usePathname();

  const menuItems: SettingsMenuItem[] = [
    {
      id: "public-profile",
      label: "Public Profile",
      href: `/edit/profile/${accountId}`,
      icon: <PersonIcon width="16" height="16" />,
      condition: canReadAccount,
    },
    {
      id: "security",
      label: "Security",
      href: `/edit/security/${accountId}`,
      icon: <LockClosedIcon width="16" height="16" />,
      condition: canReadAccount,
    },
    ...(accountType === "organization"
      ? [
          {
            id: "memberships",
            label: "Memberships",
            href: `/edit/memberships/${accountId}`,
            icon: <PersonIcon width="16" height="16" />,
            condition: canReadMembership,
          },
        ]
      : []),
  ];

  const filteredMenuItems = menuItems.filter((item) => item.condition);

  return (
    <Flex gap="6" className={styles.settingsLayout}>
      {/* Left sidebar menu */}
      <Box className={styles.settingsSidebar} style={{ minWidth: "200px", maxWidth: "250px" }}>
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
                  className={`${styles.settingsMenuItem} ${isActive ? styles.active : ""}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    textDecoration: "none",
                    color: isActive ? "var(--accent-11)" : "var(--gray-11)",
                    backgroundColor: isActive ? "var(--accent-3)" : "transparent",
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
      <Box className={styles.settingsContent} style={{ flex: 1, minWidth: 0 }}>
        {children}
      </Box>
    </Flex>
  );
}
