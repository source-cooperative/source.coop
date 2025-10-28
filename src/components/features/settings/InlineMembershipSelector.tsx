"use client";

import { Badge, BadgeProps, Select } from "@radix-ui/themes";
import { Membership, MembershipRole, MembershipState } from "@/types";
import { useState } from "react";

interface MembershipFieldSelectorProps {
  membership: Membership;
  field: "role" | "state";
  options: Array<{
    value: MembershipRole | MembershipState;
    displayName: string;
    color: BadgeProps["color"];
    disabled?: boolean;
  }>;
  disabled?: boolean;
  formId?: string;
}

export function MembershipFieldSelector({
  membership,
  field,
  options,
  disabled = false,
  formId,
}: MembershipFieldSelectorProps) {
  const [selectedValue, setSelectedValue] = useState(String(membership[field]));

  const currentOption = options.find((opt) => opt.value === selectedValue);
  const displayName = currentOption?.displayName || selectedValue;
  const color = currentOption?.color || "gray";

  if (disabled) {
    return <Badge color={color}>{displayName}</Badge>;
  }

  return (
    <Select.Root
      name={field}
      form={formId}
      value={selectedValue}
      onValueChange={setSelectedValue}
      disabled={disabled}
    >
      <Select.Trigger variant="ghost">
        <Badge color={color}>{displayName}</Badge>
      </Select.Trigger>
      <Select.Content variant="soft">
        {options.map((option) => (
          <Select.Item
            key={String(option.value)}
            value={String(option.value)}
            disabled={option.disabled}
          >
            <Badge color={option.color}>{option.displayName}</Badge>
          </Select.Item>
        ))}
      </Select.Content>
    </Select.Root>
  );
}
