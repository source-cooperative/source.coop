"use client";

import { Avatar } from "@radix-ui/themes";
import type { PublicAccount } from "@/types";

interface ProfileAvatarProps {
  account: PublicAccount;
  size?: "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";
}

export function ProfileAvatar({ account, size = "6" }: ProfileAvatarProps) {
  return (
    <Avatar
      size={size}
      src={account.profile_image}
      fallback={account.name?.[0]?.toUpperCase() || ""}
      radius={account.type === "individual" ? "full" : "medium"}
    />
  );
}
