import type { ComponentType, ComponentProps } from "react";
import { MagnifyingGlassIcon, Link1Icon } from "@radix-ui/react-icons";
import { adminUserLookupUrl, adminDataConnectionsUrl } from "@/lib";

type IconProps = ComponentProps<typeof MagnifyingGlassIcon>;

/**
 * A single admin tool. Add a new entry here (plus its route under
 * `src/app/(app)/admin/`) to surface it in both the admin home page and the
 * account dropdown's Admin submenu.
 */
export interface AdminTool {
  name: string;
  description: string;
  href: string;
  Icon: ComponentType<IconProps>;
}

export const ADMIN_TOOLS: AdminTool[] = [
  {
    name: "User Lookup",
    description: "Find a user by email and open their profile.",
    href: adminUserLookupUrl(),
    Icon: MagnifyingGlassIcon,
  },
  {
    name: "Data Connections",
    description: "Manage the storage backends products mirror their data to.",
    href: adminDataConnectionsUrl(),
    Icon: Link1Icon,
  },
];
