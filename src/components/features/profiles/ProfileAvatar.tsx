"use client";

import { Avatar } from "@radix-ui/themes";
import { avatarUrl } from "@/lib/avatar";
import type { Account, PublicAccount } from "@/types";

interface ProfileAvatarProps {
  account: Account | PublicAccount;
  size?: "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";
}

export function ProfileAvatar({ account, size = "6" }: ProfileAvatarProps) {
  const avatarSrc = avatarUrl(account);

  return (
    <Avatar
      size={size}
      src={avatarSrc}
      fallback={account.name?.[0]?.toUpperCase() || ""}
      radius={account.type === "individual" ? "full" : "medium"}
    />
  );
}
