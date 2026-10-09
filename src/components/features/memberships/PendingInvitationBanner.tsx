"use client";

import { Membership, MembershipRole } from "@/types";
import { Callout, Button, Flex } from "@radix-ui/themes";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { acceptInvitation, rejectInvitation } from "@/lib/actions/memberships";

interface PendingInvitationBannerProps {
  invitation: Membership;
  organizationName: string;
  productName?: string;
}

export function PendingInvitationBanner({
  invitation,
  organizationName,
  productName,
}: PendingInvitationBannerProps) {
  const t = useTranslations("PendingInvitationBanner");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isHidden, setIsHidden] = useState(false);

  if (isHidden) return null;

  const handleAccept = async () => {
    setIsProcessing(true);
    try {
      const result = await acceptInvitation(invitation.membership_id);
      if (result.success) {
        setIsHidden(true);
        window.location.reload(); // Reload to show updated UI
      } else {
        alert(result.error || t("acceptFailed"));
        setIsProcessing(false);
      }
    } catch (error) {
      alert(t("acceptError"));
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    setIsProcessing(true);
    try {
      const result = await rejectInvitation(invitation.membership_id);
      if (result.success) {
        setIsHidden(true);
      } else {
        alert(result.error || t("rejectFailed"));
        setIsProcessing(false);
      }
    } catch (error) {
      alert(t("rejectError"));
      setIsProcessing(false);
    }
  };

  const invitationType = productName ? "product" : "organization";
  const targetName = productName || organizationName;

  const roleName =
    (
      {
        owners: t("roleOwners"),
        maintainers: t("roleMaintainers"),
        read_data: t("roleReadData"),
        write_data: t("roleWriteData"),
      } as Record<MembershipRole, string>
    )[invitation.role] || invitation.role;

  return (
    <Callout.Root color="blue" role="status">
      <Callout.Icon>
        <InfoCircledIcon />
      </Callout.Icon>
      <Flex direction="column" gap="2" style={{ width: "100%" }}>
        <Callout.Text>
          {t.rich("message", {
            invitationType,
            role: invitation.role,
            roleName,
            strong: (chunks) => <strong>{chunks}</strong>,
          })}
        </Callout.Text>
        <Flex gap="2">
          <Button
            size="1"
            onClick={handleAccept}
            disabled={isProcessing}
            variant="solid"
          >
            {isProcessing ? t("processing") : t("accept")}
          </Button>
          <Button
            size="1"
            onClick={handleReject}
            disabled={isProcessing}
            variant="soft"
            color="gray"
          >
            {t("decline")}
          </Button>
        </Flex>
      </Flex>
    </Callout.Root>
  );
}
