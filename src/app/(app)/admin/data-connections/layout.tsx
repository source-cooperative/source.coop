import { ReactNode } from "react";
import { Link1Icon } from "@radix-ui/react-icons";
import {
  SettingsLayout,
  SettingsHeader,
} from "@/components/features/settings";
import { Heading } from "@radix-ui/themes";
import { adminDataConnectionsUrl } from "@/lib/urls";

interface DataConnectionsLayoutProps {
  children: ReactNode;
}

export default function DataConnectionsLayout({
  children,
}: DataConnectionsLayoutProps) {
  const menuItems = [
    {
      id: "data-connections",
      label: "Data Connections",
      href: adminDataConnectionsUrl(),
      icon: <Link1Icon width="16" height="16" />,
      condition: true,
    },
  ];

  return (
    <>
      <SettingsHeader>
        <Heading size="5">Admin</Heading>
      </SettingsHeader>
      <SettingsLayout menuItems={menuItems}>{children}</SettingsLayout>
    </>
  );
}
