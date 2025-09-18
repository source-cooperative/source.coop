import { ReactNode } from "react";
import { AccountSettingsLayoutWrapper } from "@/components/features/settings/AccountSettingsLayoutWrapper";
import { Actions } from "@/types";

interface MembershipsLayoutProps {
  children: ReactNode;
  params: Promise<{ account_id: string }>;
}

export default async function MembershipsLayout({
  children,
  params,
}: MembershipsLayoutProps) {
  const { account_id } = await params;

      return (
        <AccountSettingsLayoutWrapper
          accountId={account_id}
          requiredPermission={Actions.GetMembership}
          currentSettingType="memberships"
          additionalChecks={(account) => account.type === "organization"}
        >
          {children}
        </AccountSettingsLayoutWrapper>
      );
}
