"use client";
import { DropdownMenu } from "@radix-ui/themes";
import Link from "next/link";
import { CSSProperties, ReactNode } from "react";

// Used by Links rendered AS a menu item (Radix `asChild`). The Link inherits
// the item's padding/layout/highlight from Radix, so we only neutralize the
// global anchor styles (accent color + underline) and keep the icon+label
// laid out in a row.
export const dropdownMenuLinkStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-2)",
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
          // `asChild` makes the <Link> itself the menu item: one real anchor
          // handles left-click (Next client-side nav), keyboard activation
          // (Radix triggers the anchor), and open-in-new-tab — a single
          // navigation with no duplicate history entry.
          <DropdownMenu.Item
            key={index}
            color={item.color}
            disabled={item.disabled}
            asChild
          >
            <Link href={item.href} style={dropdownMenuLinkStyle}>
              {item.children}
            </Link>
          </DropdownMenu.Item>
        ) : (
          <DropdownMenu.Item
            key={index}
            color={item.color}
            disabled={item.disabled}
            onSelect={item.onClick}
          >
            {item.children}
          </DropdownMenu.Item>
        )
      )}
      {showSeparator && <DropdownMenu.Separator />}
    </>
  );
}
