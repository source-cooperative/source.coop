"use client";

import { useState } from "react";
import { Membership, MembershipRole } from "@/types";
import {
  Badge,
  Select,
  Flex,
  BadgeProps,
  Text,
  Callout,
} from "@radix-ui/themes";
import { updateMemberRole } from "@/lib/actions/memberships";
import {
  CheckCircledIcon,
  CrossCircledIcon,
  UpdateIcon,
} from "@radix-ui/react-icons";

interface InlineRoleSelectorProps {
  membership: Membership;
  disabled?: boolean;
}

export function InlineRoleSelector({
  membership,
  disabled = false,
}: InlineRoleSelectorProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentRole, setCurrentRole] = useState(membership.role);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const getRoleBadgeColor = (role: MembershipRole): BadgeProps["color"] => {
    switch (role) {
      case MembershipRole.Owners:
        return "amber";
      case MembershipRole.Maintainers:
        return "iris";
      case MembershipRole.WriteData:
        return "green";
      case MembershipRole.ReadData:
        return "blue";
      default:
        return "gray";
    }
  };

  const getRoleDisplayName = (role: MembershipRole): string => {
    switch (role) {
      case MembershipRole.Owners:
        return "Owner";
      case MembershipRole.Maintainers:
        return "Maintainer";
      case MembershipRole.WriteData:
        return "Writer";
      case MembershipRole.ReadData:
        return "Reader";
      default:
        return role;
    }
  };

  const handleRoleChange = async (newRole: MembershipRole) => {
    if (newRole === membership.role || isUpdating) return;

    setIsUpdating(true);
    setStatus("idle");
    setErrorMessage("");
    
    try {
      const formData = new FormData();
      formData.append("membership_id", membership.membership_id);
      formData.append("role", newRole);

      const result = await updateMemberRole(null, formData);

      if (result.success) {
        setCurrentRole(newRole);
        setStatus("success");
        // Clear success status after 2 seconds
        setTimeout(() => setStatus("idle"), 2000);
      } else {
        // Revert on error
        setCurrentRole(membership.role);
        setStatus("error");
        setErrorMessage(result.message || "Failed to update role");
        // Clear error status after 5 seconds
        setTimeout(() => {
          setStatus("idle");
          setErrorMessage("");
        }, 5000);
      }
    } catch (error) {
      // Revert on error
      setCurrentRole(membership.role);
      setStatus("error");
      setErrorMessage("Network error occurred");
      // Clear error status after 5 seconds
      setTimeout(() => {
        setStatus("idle");
        setErrorMessage("");
      }, 5000);
    } finally {
      setIsUpdating(false);
    }
  };

  if (disabled) {
    return (
      <Badge color={getRoleBadgeColor(currentRole)}>
        {getRoleDisplayName(currentRole)}
      </Badge>
    );
  }

  return (
    <Flex direction="column" gap="1">
      <Select.Root
        value={currentRole}
        onValueChange={handleRoleChange}
        disabled={isUpdating}
      >
        <Select.Trigger
          variant="ghost"
          style={{ cursor: disabled ? "default" : "pointer" }}
        >
          <Flex align="center" gap="2">
            <Badge color={getRoleBadgeColor(currentRole)}>
              {getRoleDisplayName(currentRole)}
            </Badge>
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
          <Select.Item value={MembershipRole.Owners}>
            <Badge color={getRoleBadgeColor(MembershipRole.Owners)}>
              Owner
            </Badge>
          </Select.Item>
          <Select.Item value={MembershipRole.Maintainers}>
            <Badge color={getRoleBadgeColor(MembershipRole.Maintainers)}>
              Maintainer
            </Badge>
          </Select.Item>
          <Select.Item value={MembershipRole.WriteData}>
            <Badge color={getRoleBadgeColor(MembershipRole.WriteData)}>
              Writer
            </Badge>
          </Select.Item>
          <Select.Item value={MembershipRole.ReadData}>
            <Badge color={getRoleBadgeColor(MembershipRole.ReadData)}>
              Reader
            </Badge>
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
