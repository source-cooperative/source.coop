"use client";
import { DropdownMenu, Flex } from "@radix-ui/themes";
import Link from "next/link";
import { GearIcon } from "@radix-ui/react-icons";
import { adminUrl } from "@/lib";
import { isAdmin } from "@/lib/api/authz";
import { UserSession } from "@/types";
import { dropdownMenuLinkStyle } from "@/components/layout/DropdownSection";
import { ADMIN_TOOLS } from "./tools";

// Admin-only flyout in the account dropdown. Renders nothing for non-admins,
// so callers can drop it in unconditionally. Tools are driven by ADMIN_TOOLS
// so a new tool shows up here automatically.
export function AdminSubmenu({ session }: { session: UserSession }) {
  if (!isAdmin(session)) {
    return null;
  }

  return (
    <>
      <DropdownMenu.Sub>
        <DropdownMenu.SubTrigger>
          <Flex align="center" gap="2">
            <GearIcon />
            Admin
          </Flex>
        </DropdownMenu.SubTrigger>
        <DropdownMenu.SubContent>
          <DropdownMenu.Item asChild>
            <Link href={adminUrl()} style={dropdownMenuLinkStyle}>
              Admin Home
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Separator />
          {ADMIN_TOOLS.map(({ name, href, Icon }) => (
            <DropdownMenu.Item key={href} asChild>
              <Link href={href} style={dropdownMenuLinkStyle}>
                <Icon />
                {name}
              </Link>
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.SubContent>
      </DropdownMenu.Sub>
      <DropdownMenu.Separator />
    </>
  );
}
