"use client";

import { Avatar } from "@radix-ui/themes";
import md5 from "md5";
import type { Account } from "@/types";

interface ProfileAvatarProps {
  account: Account;
  size?: "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";
}

export function ProfileAvatar({ account, size = "6" }: ProfileAvatarProps) {
  let avatarSrc: string | undefined;

  // Priority 1: Use profile_image if set
  if (account.metadata_public?.profile_image) {
    avatarSrc = account.metadata_public.profile_image;
  }
  // Priority 2: Use Gravatar for individuals
  else if (account.type === "individual") {
    const primaryEmail = account.emails?.find(
      (email) => email.is_primary
    )?.address;
    if (primaryEmail) {
      const hash = md5(primaryEmail.toLowerCase().trim());
      avatarSrc = `https://www.gravatar.com/avatar/${hash}?d=identicon&s=200`;
    }
  }

  return (
    <Avatar
      size={size}
      src={avatarSrc}
      fallback={account.name?.[0]?.toUpperCase() || ""}
      radius={account.type === "individual" ? "full" : "medium"}
    />
  );
}
