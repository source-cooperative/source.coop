"use client";
import { DropdownMenu } from "@radix-ui/themes";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CSSProperties, ReactNode } from "react";

export const dropdownMenuLinkStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-2)",
  alignSelf: "stretch",
  flex: 1,
  marginLeft: "calc(-1 * var(--base-menu-item-padding-left))",
  marginRight: "calc(-1 * var(--base-menu-item-padding-right))",
  paddingLeft: "var(--base-menu-item-padding-left)",
  paddingRight: "var(--base-menu-item-padding-right)",
  color: "inherit",
  textDecoration: "none",
};

export interface DropdownItem {
  href?: string;
  onClick?: () => void;
  children: ReactNode;
  color?: DropdownMenu.ItemProps["color"];
  disabled?: boolean;
  condition?: boolean;
}

export interface DropdownSectionProps {
  label?: string;
  items: DropdownItem[];
  showSeparator?: boolean;
  condition?: boolean;
}

export function DropdownSection({
  label,
  items,
  showSeparator = true,
  condition = true,
}: DropdownSectionProps) {
  const router = useRouter();

  // Only render if condition is true and there are items to show
  if (
    !condition ||
    items.filter(({ condition = true }) => condition).length === 0
  ) {
    return null;
  }

  return (
    <>
      {label && <DropdownMenu.Label>{label}</DropdownMenu.Label>}
      {items
        .filter(({ condition = true }) => condition)
        .map((item, index) =>
        item.href ? (
          <DropdownMenu.Item
            key={index}
            color={item.color}
            disabled={item.disabled}
            onSelect={() => router.push(item.href!)}
          >
            {/* Left-click is handled by onSelect (router.push); preventDefault
                stops the <Link>'s native navigation from pushing a second,
                duplicate history entry. Right/middle-click still use the
                anchor for open-in-new-tab. */}
            <Link
              href={item.href}
              style={dropdownMenuLinkStyle}
              onClick={(e) => e.preventDefault()}
            >
              {item.children}
            </Link>
          </DropdownMenu.Item>
        ) : (
          <DropdownMenu.Item
            key={index}
            color={item.color}
            disabled={item.disabled}
            onClick={item.onClick}
          >
            {item.children}
          </DropdownMenu.Item>
        )
      )}
      {showSeparator && <DropdownMenu.Separator />}
    </>
  );
}
