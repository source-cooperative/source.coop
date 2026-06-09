"use client";
import { DropdownMenu, Flex } from "@radix-ui/themes";
import Link from "next/link";
import { GearIcon } from "@radix-ui/react-icons";
import { adminUserLookupUrl } from "@/lib";
import { isAdmin } from "@/lib/api/authz";
import { UserSession } from "@/types";
import { dropdownMenuLinkStyle } from "@/components/layout/DropdownSection";

// Admin-only flyout in the account dropdown. Renders nothing for non-admins,
// so callers can drop it in unconditionally.
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
            <Link href={adminUserLookupUrl()} style={dropdownMenuLinkStyle}>
              User Lookup
            </Link>
          </DropdownMenu.Item>
        </DropdownMenu.SubContent>
      </DropdownMenu.Sub>
      <DropdownMenu.Separator />
    </>
  );
}
