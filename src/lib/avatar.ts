import md5 from "md5";
import type { Account, PublicAccount } from "@/types";

/**
 * The picture that stands for an account: its uploaded image, else a person's
 * Gravatar (an identicon when they have none), else nothing. A public view
 * carries it already, worked out while the emails were still there.
 */
export function avatarUrl(account: Account | PublicAccount, size = 200): string | undefined {
  if (!("created_at" in account)) return account.profile_image;
  if (account.metadata_public?.profile_image) {
    return account.metadata_public.profile_image;
  }
  const email = account.emails?.find((e) => e.is_primary)?.address;
  if (account.type === "individual" && email) {
    return `https://www.gravatar.com/avatar/${md5(email.toLowerCase().trim())}?d=identicon&s=${size}`;
  }
}
