"use client";

import { Membership, MembershipRole } from "@/types";
import { Callout, Button, Flex } from "@radix-ui/themes";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import { useState } from "react";
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
        alert(result.error || "Failed to accept invitation");
        setIsProcessing(false);
      }
    } catch (error) {
      alert("An error occurred while accepting the invitation");
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
        alert(result.error || "Failed to reject invitation");
        setIsProcessing(false);
      }
    } catch (error) {
      alert("An error occurred while rejecting the invitation");
      setIsProcessing(false);
    }
  };

  const invitationType = productName ? "product" : "organization";
  const targetName = productName || organizationName;

  const roleName =
    (
      {
        owners: "Owner",
        maintainers: "Maintainer",
        read_data: "Data Reader",
        write_data: "Data Writer",
      } as Record<MembershipRole, string>
    )[invitation.role] || invitation.role;

  return (
    <Callout.Root color="blue" role="status">
      <Callout.Icon>
        <InfoCircledIcon />
      </Callout.Icon>
      <Flex direction="column" gap="2" style={{ width: "100%" }}>
        <Callout.Text>
          You have been invited to join this {invitationType} as a
          {["a", "e", "i", "o", "u"].includes(roleName.charAt(0).toLowerCase())
            ? "n "
            : " "}
          <strong>{roleName}</strong>.
        </Callout.Text>
        <Flex gap="2">
          <Button
            size="1"
            onClick={handleAccept}
            disabled={isProcessing}
            variant="solid"
          >
            {isProcessing ? "Processing..." : "Accept"}
          </Button>
          <Button
            size="1"
            onClick={handleReject}
            disabled={isProcessing}
            variant="soft"
            color="gray"
          >
            Decline
          </Button>
        </Flex>
      </Flex>
    </Callout.Root>
  );
}
