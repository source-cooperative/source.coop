import { Text, Flex, HoverCard } from "@radix-ui/themes";
import { MonoText } from "./MonoText";
import { Account } from "@/types";
import { ProfileAvatar } from "../features/profiles";

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
          maxWidth: "300px",
          padding: "16px",
          backgroundColor: "var(--gray-2)",
          border: "1px solid var(--gray-6)",
          borderRadius: "8px",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
        }}
      >
        <Flex direction="column" gap="3">
          <Flex align="center" gap="3">
            <ProfileAvatar account={account} size="2" />
            <Flex direction="column" gap="1">
              <Text size="3" weight="bold">
                {account.name}
              </Text>
              <MonoText size="1" color="gray">
                @{account.account_id}
              </MonoText>
            </Flex>
          </Flex>

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
