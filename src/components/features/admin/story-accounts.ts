import type { PublicAccount } from "@/types";
import type { AccountsById } from "@/components/core/AccountMention";

// Cast rather than built out, as in AccountInfoHoverCard's stories: the card
// reads a few public fields, and no email keeps ProfileAvatar offline.
const account = (account_id: string, name: string, type: string, bio?: string) =>
  ({
    account_id,
    name,
    type,
    metadata_public: bio ? { bio } : {},
  }) as unknown as PublicAccount;

/** The accounts the admin tag stories name, for their cards on hover. */
export const storyAccounts: AccountsById = Object.fromEntries(
  [
    account("alukach", "Anthony Lukach", "individual", "Source Cooperative admin."),
    account("fiboa", "fiboa", "organization", "Field boundaries for AI and EO."),
    account("polar-lab", "Polar Lab", "organization"),
    account("ftw", "Fields of The World", "organization"),
  ].map((a) => [a.account_id, a])
);
