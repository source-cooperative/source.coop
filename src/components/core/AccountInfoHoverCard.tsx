import { Text, Flex, HoverCard } from "@radix-ui/themes";
import { Account } from "@/types";
import { AccountIdentity, accountCardSurface } from "./AccountIdentity";
// Deep import, not the `../features/profiles` barrel: that barrel also
// re-exports EditProfileForm and OrganizationMembers, which reach server-only
// modules. Pulling the whole barrel in for one avatar drags those into any
// browser bundle that renders an account name.
import { ProfileAvatar } from "../features/profiles/ProfileAvatar";

interface AccountInfoHoverCardProps {
  account: Account;
  children: React.ReactNode;
  showHoverCard?: boolean;
  isLink?: boolean;
}

export function AccountInfoHoverCard({
  account,
  children,
  showHoverCard = true,
  isLink = true,
}: AccountInfoHoverCardProps) {
  if (!showHoverCard) {
    return <>{children}</>;
  }

  return (
    <HoverCard.Root>
      <HoverCard.Trigger>
        <span style={isLink ? { cursor: "pointer" } : {}}>{children}</span>
      </HoverCard.Trigger>
      <HoverCard.Content
        sideOffset={5}
        style={{
          ...accountCardSurface,
          maxWidth: "300px",
          padding: "16px",
        }}
      >
        <Flex direction="column" gap="3">
          <AccountIdentity
            name={account.name}
            accountId={account.account_id}
            avatar={<ProfileAvatar account={account} size="2" />}
          />

          {account.metadata_public?.bio && (
            <Text size="2" color="gray">
              {account.metadata_public.bio}
            </Text>
          )}
        </Flex>
      </HoverCard.Content>
    </HoverCard.Root>
  );
}
