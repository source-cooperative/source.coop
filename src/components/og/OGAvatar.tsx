import md5 from "md5";
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
  // Get avatar source URL for individuals using Gravatar
  if (account.type === "individual") {
    const primaryEmail = account.emails?.find(
      (email) => email.is_primary
    )?.address;

    if (primaryEmail) {
      const hash = md5(primaryEmail.toLowerCase().trim());
      const avatarSrc = `https://www.gravatar.com/avatar/${hash}?d=identicon&s=${size}`;

      return (
        <img
          src={avatarSrc}
          alt={`${account.name} avatar`}
          width={size}
          height={size}
          style={{
            borderRadius: "50%",
          }}
        />
      );
    }
  }

  // For organizations or individuals without email, show first letter
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
