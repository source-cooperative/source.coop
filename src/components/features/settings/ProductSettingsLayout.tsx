"use client";

import { ReactNode } from "react";
import { Box, Flex, Text, Separator } from "@radix-ui/themes";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  GearIcon, 
  PersonIcon, 
  LockClosedIcon,
  GlobeIcon,
  ArchiveIcon 
} from "@radix-ui/react-icons";
import styles from "./ProductSettingsLayout.module.css";

interface ProductSettingsMenuItem {
  id: string;
  label: string;
  href: string;
  icon?: ReactNode;
  condition?: boolean;
}

interface ProductSettingsLayoutProps {
  children: ReactNode;
  accountId: string;
  productId: string;
  canReadProduct: boolean;
  canReadMembership: boolean;
  canUpdateProduct: boolean;
}

export function ProductSettingsLayout({
  children,
  accountId,
  productId,
  canReadProduct,
  canReadMembership,
  canUpdateProduct,
}: ProductSettingsLayoutProps) {
  const pathname = usePathname();

  const menuItems: ProductSettingsMenuItem[] = [
    {
      id: "general",
      label: "General",
      href: `/edit/product/${accountId}/${productId}`,
      icon: <GearIcon width="16" height="16" />,
      condition: canReadProduct,
    },
    {
      id: "access",
      label: "Access",
      href: `/edit/product/${accountId}/${productId}/access`,
      icon: <LockClosedIcon width="16" height="16" />,
      condition: canReadMembership,
    },
    {
      id: "visibility",
      label: "Visibility",
      href: `/edit/product/${accountId}/${productId}/visibility`,
      icon: <GlobeIcon width="16" height="16" />,
      condition: canReadProduct,
    },
    {
      id: "archive",
      label: "Archive",
      href: `/edit/product/${accountId}/${productId}/archive`,
      icon: <ArchiveIcon width="16" height="16" />,
      condition: canUpdateProduct,
    },
  ];

  const filteredMenuItems = menuItems.filter((item) => item.condition);

  return (
    <Flex gap="6" className={styles.productSettingsLayout}>
      {/* Left sidebar menu */}
      <Box className={styles.productSettingsSidebar} style={{ minWidth: "200px", maxWidth: "250px" }}>
        <Box>
          <Text size="2" weight="bold" color="gray" mb="3">
            Product Settings
          </Text>
          <Flex direction="column" gap="1">
            {filteredMenuItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`${styles.productSettingsMenuItem} ${isActive ? styles.active : ""}`}
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
      <Box className={styles.productSettingsContent} style={{ flex: 1, minWidth: 0 }}>
        {children}
      </Box>
    </Flex>
  );
}
