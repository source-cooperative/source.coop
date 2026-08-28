import { Text, Flex, Link as RadixLink } from "@radix-ui/themes";
import { MonoText } from "./MonoText";
import { AccountInfoHoverCard } from "./AccountInfoHoverCard";
import { accountUrl } from "@/lib/urls";
import { Account } from "@/types";
import Link from "next/link";
// Deep import, not the `../features/profiles` barrel: that barrel also
// re-exports EditProfileForm and OrganizationMembers, which reach server-only
// modules. Pulling the whole barrel in for one avatar drags those into any
// browser bundle that renders an account name.
import { ProfileAvatar } from "../features/profiles/ProfileAvatar";

interface AccountDisplayProps {
  account: Account;
  showHoverCard?: boolean;
  size?: React.ComponentProps<typeof ProfileAvatar>["size"];
}

export function AvatarLinkCompact({
  showAccountId = false,
  link = true,
  size = "2",
  ...props
}: AccountDisplayProps & {
  showHoverCard?: boolean;
  showAccountId?: boolean;
  link?: boolean;
}) {
  const content = (
    <>
      <ProfileAvatar account={props.account} size={size} />
      <Text size="2" ml="2">
        {props.account.name}
      </Text>
    </>
  );

  return (
    <Flex gap="2" align="center">
      <AccountInfoHoverCard {...props} isLink={link}>
        {link ? (
          <RadixLink asChild>
            <Link href={accountUrl(props.account.account_id)}>{content}</Link>
          </RadixLink>
        ) : (
          content
        )}
      </AccountInfoHoverCard>
      {showAccountId && (
        <MonoText size="1">{props.account.account_id}</MonoText>
      )}
    </Flex>
  );
}

export function DisplayNameLink(props: AccountDisplayProps) {
  return (
    <AccountInfoHoverCard {...props}>
      <RadixLink asChild>
        <Link href={accountUrl(props.account.account_id)}>
          {props.account.name}
        </Link>
      </RadixLink>
    </AccountInfoHoverCard>
  );
}
