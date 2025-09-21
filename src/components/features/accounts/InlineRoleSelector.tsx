"use client";

import { useState } from "react";
import { Membership, MembershipRole } from "@/types";
import { Badge, Select, Flex, BadgeProps } from "@radix-ui/themes";
import { updateMemberRole } from "@/lib/actions/memberships";

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
    try {
      const formData = new FormData();
      formData.append("membership_id", membership.membership_id);
      formData.append("role", newRole);

      const result = await updateMemberRole(null, formData);

      if (result.success) {
        setCurrentRole(newRole);
        // The page will revalidate automatically due to revalidatePath in the action
      } else {
        // Revert on error
        setCurrentRole(membership.role);
        console.error("Failed to update role:", result.message);
      }
    } catch (error) {
      // Revert on error
      setCurrentRole(membership.role);
      console.error("Failed to update role:", error);
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
        </Flex>
      </Select.Trigger>
      <Select.Content>
        <Select.Item value={MembershipRole.Owners}>
          <Badge color={getRoleBadgeColor(MembershipRole.Owners)}>Owner</Badge>
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
  );
}
