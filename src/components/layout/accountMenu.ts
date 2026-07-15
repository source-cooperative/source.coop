import { accountUrl, productUrl } from "@/lib/urls";
import type { Membership } from "@/types";

export interface InvitationLink {
  href: string;
  label: string;
}

/**
 * Where a pending invitation should link so the user can accept it: the product
 * page for a product invite (repository_id set), otherwise the organization
 * page. Both pages render the PendingInvitationBanner. Falls back to ids when a
 * display name couldn't be resolved.
 */
export function invitationLink(
  membership: Pick<Membership, "membership_account_id" | "repository_id">,
  names: { organizationName?: string; productTitle?: string }
): InvitationLink {
  const { membership_account_id, repository_id } = membership;
  if (repository_id) {
    return {
      href: productUrl(membership_account_id, repository_id),
      label: names.productTitle ?? `${membership_account_id}/${repository_id}`,
    };
  }
  return {
    href: accountUrl(membership_account_id),
    label: names.organizationName ?? membership_account_id,
  };
}
