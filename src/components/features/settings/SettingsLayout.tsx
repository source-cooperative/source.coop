"use client";

import { ReactNode } from "react";
import { Box, Flex, Text } from "@radix-ui/themes";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./SettingsLayout.module.css";

export interface SettingsMenuItem {
  id: string;
  label: string;
  href: string;
  icon?: ReactNode;
  condition?: boolean;
}

interface SettingsLayoutProps {
  children: ReactNode;
  menuItems: SettingsMenuItem[];
}

export function SettingsLayout({ children, menuItems }: SettingsLayoutProps) {
  const pathname = usePathname();

  const filteredMenuItems = menuItems.filter((item) => item.condition);

  return (
    <Box>
      <Flex gap="6" className={styles.settingsLayout}>
        {/* Left sidebar menu */}
        <Box
          className={styles.settingsSidebar}
          style={{
            minWidth: "200px",
            maxWidth: "250px",
          }}
        >
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

        {/* Right content area */}
        <Box
          className={styles.settingsContent}
          style={{
            flex: 1,
            minWidth: 0,
            borderLeft: "1px solid var(--gray-6)",
            paddingLeft: "2em",
          }}
        >
          {children}
        </Box>
      </Flex>
    </Box>
  );
}
