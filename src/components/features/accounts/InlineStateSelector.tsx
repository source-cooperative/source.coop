"use client";

import { useState } from "react";
import { Membership, MembershipState } from "@/types";
import { Select, Flex, Text, Badge } from "@radix-ui/themes";
import { revokeMembership } from "@/lib/actions/memberships";

interface InlineStateSelectorProps {
  membership: Membership;
  disabled?: boolean;
}

export function InlineStateSelector({
  membership,
  disabled = false,
}: InlineStateSelectorProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentState, setCurrentState] = useState(membership.state);

  const getStateBadgeColor = (state: MembershipState) => {
    switch (state) {
      case MembershipState.Member:
        return "green";
      case MembershipState.Invited:
        return "blue";
      case MembershipState.Revoked:
        return "red";
      default:
        return "gray";
    }
  };

  const getStateDisplayName = (state: MembershipState) => {
    switch (state) {
      case MembershipState.Member:
        return "Member";
      case MembershipState.Invited:
        return "Invited";
      case MembershipState.Revoked:
        return "Revoked";
      default:
        return state;
    }
  };

  const handleStateChange = async (newState: MembershipState) => {
    if (newState === membership.state || isUpdating) return;

    // Validate state transitions based on business rules
    const currentState = membership.state;
    const isValidTransition = 
      (currentState === MembershipState.Member && newState === MembershipState.Revoked) ||
      (currentState === MembershipState.Revoked && newState === MembershipState.Invited) ||
      (currentState === MembershipState.Invited && newState === MembershipState.Revoked);

    if (!isValidTransition) {
      console.warn("Invalid state transition:", currentState, "->", newState);
      return;
    }

    setIsUpdating(true);
    try {
      if (newState === MembershipState.Revoked) {
        // Use the revoke action for revoked state
        const formData = new FormData();
        formData.append("membership_id", membership.membership_id);
        
        const result = await revokeMembership(null, formData);
        
        if (result.success) {
          setCurrentState(newState);
        } else {
          setCurrentState(membership.state);
          console.error("Failed to revoke membership:", result.message);
        }
      } else if (newState === MembershipState.Invited) {
        // For inviting a previously revoked member, we'd need a new server action
        // For now, just revert since we don't have this action yet
        setCurrentState(membership.state);
        console.warn("Re-inviting revoked members not implemented yet");
      }
    } catch (error) {
      setCurrentState(membership.state);
      console.error("Failed to update state:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  if (disabled) {
    return (
      <Badge color={getStateBadgeColor(currentState)}>
        {getStateDisplayName(currentState)}
      </Badge>
    );
  }

  return (
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
          <Badge color={getStateBadgeColor(currentState)}>
            {getStateDisplayName(currentState)}
          </Badge>
        </Flex>
      </Select.Trigger>
      <Select.Content>
        <Select.Item 
          value={MembershipState.Member}
          disabled={currentState === MembershipState.Invited}
        >
          <Badge color="green">Member</Badge>
        </Select.Item>
        <Select.Item 
          value={MembershipState.Invited}
          disabled={currentState === MembershipState.Member}
        >
          <Badge color="blue">Invited</Badge>
        </Select.Item>
        <Select.Item 
          value={MembershipState.Revoked}
          disabled={currentState === MembershipState.Revoked}
        >
          <Badge color="red">Revoked</Badge>
        </Select.Item>
      </Select.Content>
    </Select.Root>
  );
}
