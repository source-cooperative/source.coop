import { avatarUrl } from "@/lib/avatar";
import type { Account } from "@/types";

interface OGAvatarProps {
  account: Account;
  size?: number;
}

/**
 * Server-side avatar component for OpenGraph images.
 * Cannot use Radix UI Avatar since OG image generation requires pure server-side rendering.
 */
export function OGAvatar({ account, size = 350 }: OGAvatarProps) {
  const avatarSrc = avatarUrl(account, size);

  // If we have an avatar source, render it
  if (avatarSrc) {
    return (
      <img
        src={avatarSrc}
        alt={`${account.name} avatar`}
        width={size}
        height={size}
        style={{
          borderRadius: account.type === "individual" ? "50%" : 16,
        }}
      />
    );
  }

  // Fallback: Show first letter
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: account.type === "individual" ? "50%" : 16,
        backgroundColor: "#F5F5F5",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.4,
        fontWeight: 600,
        color: "#666666",
      }}
    >
      {account.name?.[0]?.toUpperCase() || ""}
    </div>
  );
}
