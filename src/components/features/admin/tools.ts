import type { ComponentType, ComponentProps } from "react";
import {
  MagnifyingGlassIcon,
  Link1Icon,
  BarChartIcon,
} from "@radix-ui/react-icons";
import {
  adminAnalyticsUrl,
  adminUserLookupUrl,
  adminDataConnectionsUrl,
} from "@/lib";

type IconProps = ComponentProps<typeof MagnifyingGlassIcon>;

/**
 * A single admin tool. Add a new entry here (plus its route under
 * `src/app/(app)/admin/`) to surface it in both the admin home page and the
 * account dropdown's Admin submenu.
 */
export interface AdminTool {
  /** The tool's name is `AdminTools.<key>.name` in the message catalog. */
  key: "analytics" | "userLookup" | "dataConnections";
  href: string;
  Icon: ComponentType<IconProps>;
}

export const ADMIN_TOOLS: AdminTool[] = [
  {
    key: "analytics",
    href: adminAnalyticsUrl(),
    Icon: BarChartIcon,
  },
  {
    key: "userLookup",
    href: adminUserLookupUrl(),
    Icon: MagnifyingGlassIcon,
  },
  {
    key: "dataConnections",
    href: adminDataConnectionsUrl(),
    Icon: Link1Icon,
  },
];
