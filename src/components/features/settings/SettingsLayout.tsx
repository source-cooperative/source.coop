"use client";

import { ReactNode, CSSProperties } from "react";
import { Box, Flex, Text, Tooltip } from "@radix-ui/themes";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./SettingsLayout.module.css";

export interface SettingsMenuItem {
  id: string;
  label: string;
  href: string;
  icon?: ReactNode;
  condition?: boolean;
  /** Open the link in a new tab (for links that leave the app). */
  external?: boolean;
  /** Render the item as non-interactive. */
  disabled?: boolean;
  /** Message shown on hover when the item is disabled. */
  disabledTooltip?: string;
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
          }}
        >
          <Flex direction="column" gap="1">
            {filteredMenuItems.map((item) => {
              // Active when on the item's page or any of its sub-routes (e.g.
              // a tool's create/edit pages). The "/" guard avoids matching
              // sibling routes that merely share a prefix.
              const isActive =
                !item.external &&
                (pathname === item.href ||
                  pathname.startsWith(item.href + "/"));
              const baseStyle: CSSProperties = {
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 12px",
                borderRadius: "6px",
                textDecoration: "none",
                transition: "all 0.15s ease",
              };

              if (item.disabled) {
                const disabledItem = (
                  <Flex
                    align="center"
                    className={styles.settingsMenuItem}
                    style={{
                      ...baseStyle,
                      color: "var(--gray-8)",
                      cursor: "not-allowed",
                    }}
                  >
                    {item.icon}
                    <Text size="2">{item.label}</Text>
                  </Flex>
                );

                return item.disabledTooltip ? (
                  <Tooltip key={item.id} content={item.disabledTooltip}>
                    {disabledItem}
                  </Tooltip>
                ) : (
                  <Box key={item.id}>{disabledItem}</Box>
                );
              }

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  target={item.external ? "_blank" : undefined}
                  rel={item.external ? "noopener noreferrer" : undefined}
                  className={`${styles.settingsMenuItem} ${
                    isActive ? styles.active : ""
                  }`}
                  style={{
                    ...baseStyle,
                    color: isActive ? "var(--accent-11)" : "var(--gray-11)",
                    backgroundColor: isActive
                      ? "var(--accent-3)"
                      : "transparent",
                    fontWeight: isActive ? "500" : "400",
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
        <Box className={styles.settingsContent}>{children}</Box>
      </Flex>
    </Box>
  );
}
