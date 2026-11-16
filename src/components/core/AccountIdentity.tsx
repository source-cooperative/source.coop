import { Text, Flex } from "@radix-ui/themes";
import { MonoText } from "./MonoText";

/**
 * The surface an account card sits on. Shared so the picker's suggestion list
 * and the profile hover card are visibly the same object.
 */
export const accountCardSurface: React.CSSProperties = {
  backgroundColor: "var(--gray-2)",
  border: "1px solid var(--gray-6)",
  borderRadius: "8px",
  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
};

interface AccountIdentityProps {
  name: string;
  accountId: string;
  /**
   * Passed in rather than derived, because callers have different amounts to
   * work with: a profile page holds a whole Account and can render
   * <ProfileAvatar> with its Gravatar fallback, while a search result holds
   * only public identity fields and falls back to an initial.
   */
  avatar: React.ReactNode;
  /** Display-name size. The handle stays small so the name leads. */
  size?: "2" | "3";
}

/**
 * Avatar, display name, handle — the way an account is introduced everywhere it
 * appears out of context: the profile hover card, and the account picker's
 * suggestions. Shared so a person looks the same in the list they are picked
 * from as in the card that confirms who they are.
 */
export function AccountIdentity({
  name,
  accountId,
  avatar,
  size = "3",
}: AccountIdentityProps) {
  return (
    <Flex align="center" gap="3">
      {avatar}
      <Flex direction="column" gap="1" minWidth="0">
        <Text size={size} weight="bold">
          {name}
        </Text>
        <MonoText size="1" color="gray">
          @{accountId}
        </MonoText>
      </Flex>
    </Flex>
  );
}
