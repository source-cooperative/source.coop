"use client";

import { useState } from "react";
import { Membership, MembershipState } from "@/types";
import { Select, Flex, Text, Badge, BadgeProps } from "@radix-ui/themes";
import { revokeMembership } from "@/lib/actions/memberships";
import {
  CheckCircledIcon,
  CrossCircledIcon,
  UpdateIcon,
} from "@radix-ui/react-icons";

interface InlineStateSelectorProps {
  membership: Membership;
  disabled?: boolean;
}

function StateBadge({ state }: { state: MembershipState }) {
  const stateBadgeMap: Record<MembershipState, [string, BadgeProps["color"]]> =
    {
      [MembershipState.Member]: ["Member", "green"],
      [MembershipState.Invited]: ["Invited", "blue"],
      [MembershipState.Revoked]: ["Revoked", "red"],
    };
  const [displayName, color] = stateBadgeMap[state] || [state, "gray"];
  return <Badge color={color}>{displayName}</Badge>;
}

export function InlineStateSelector({
  membership,
  disabled = false,
}: InlineStateSelectorProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentState, setCurrentState] = useState(membership.state);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const handleStateChange = async (newState: MembershipState) => {
    if (newState === membership.state || isUpdating) return;

    // Validate state transitions based on business rules
    const currentState = membership.state;
    const isValidTransition =
      (currentState === MembershipState.Member &&
        newState === MembershipState.Revoked) ||
      (currentState === MembershipState.Revoked &&
        newState === MembershipState.Invited) ||
      (currentState === MembershipState.Invited &&
        newState === MembershipState.Revoked);

    if (!isValidTransition) {
      setStatus("error");
      setErrorMessage("Invalid state transition");
      setTimeout(() => {
        setStatus("idle");
        setErrorMessage("");
      }, 3000);
      return;
    }

    setIsUpdating(true);
    setStatus("idle");
    setErrorMessage("");

    try {
      if (newState === MembershipState.Revoked) {
        // Use the revoke action for revoked state
        const formData = new FormData();
        formData.append("membership_id", membership.membership_id);

        const result = await revokeMembership(null, formData);

        if (result.success) {
          setCurrentState(newState);
          setStatus("success");
          setTimeout(() => setStatus("idle"), 2000);
        } else {
          setCurrentState(membership.state);
          setStatus("error");
          setErrorMessage(result.message || "Failed to revoke membership");
          setTimeout(() => {
            setStatus("idle");
            setErrorMessage("");
          }, 5000);
        }
      } else if (newState === MembershipState.Invited) {
        // For inviting a previously revoked member, we'd need a new server action
        // For now, just revert since we don't have this action yet
        setCurrentState(membership.state);
        setStatus("error");
        setErrorMessage("Re-inviting revoked members not implemented yet");
        setTimeout(() => {
          setStatus("idle");
          setErrorMessage("");
        }, 5000);
      }
    } catch (error) {
      setCurrentState(membership.state);
      setStatus("error");
      setErrorMessage("Network error occurred");
      setTimeout(() => {
        setStatus("idle");
        setErrorMessage("");
      }, 5000);
    } finally {
      setIsUpdating(false);
    }
  };

  if (disabled) {
    return <StateBadge state={currentState} />;
  }

  return (
    <Flex direction="column" gap="1">
      <Select.Root
        value={currentState}
        onValueChange={handleStateChange}
        disabled={isUpdating}
      >
        <Select.Trigger
          variant="ghost"
          style={{ cursor: disabled ? "default" : "pointer" }}
        >
          <Flex align="center" gap="2">
            <StateBadge state={currentState} />
            {isUpdating && (
              <UpdateIcon className="animate-spin" width="12" height="12" />
            )}
            {status === "success" && (
              <CheckCircledIcon width="12" height="12" color="var(--green-9)" />
            )}
            {status === "error" && (
              <CrossCircledIcon width="12" height="12" color="var(--red-9)" />
            )}
          </Flex>
        </Select.Trigger>
        <Select.Content variant="soft">
          <Select.Item
            value={MembershipState.Member}
            disabled={
              currentState === MembershipState.Invited ||
              // Can't invite a revoked member (must invite)
              currentState === MembershipState.Revoked
            }
          >
            <StateBadge state={MembershipState.Member} />
          </Select.Item>
          <Select.Item
            value={MembershipState.Invited}
            disabled={
              // Can't invite a current member
              currentState === MembershipState.Member
            }
          >
            <StateBadge state={MembershipState.Invited} />
          </Select.Item>
          <Select.Item
            value={MembershipState.Revoked}
            disabled={currentState === MembershipState.Revoked}
          >
            <StateBadge state={MembershipState.Revoked} />
          </Select.Item>
        </Select.Content>
      </Select.Root>

      {status === "error" && errorMessage && (
        <Text size="1" color="red">
          {errorMessage}
        </Text>
      )}
    </Flex>
  );
}
