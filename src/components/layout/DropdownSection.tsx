"use client";
import { DropdownMenu } from "@radix-ui/themes";
import Link from "next/link";
import { ReactNode } from "react";

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
      {items.map((item, index) =>
        item.href ? (
          <DropdownMenu.Item
            key={index}
            color={item.color}
            disabled={item.disabled}
            asChild
          >
            <Link href={item.href}>{item.children}</Link>
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
