import { AccountDropdown } from "./AccountDropdown";
import { getPageSession } from "@/lib/api/utils";
import { Callout, Link } from "@radix-ui/themes";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { onboardingUrl } from "@/lib/urls";
import { LoginButton } from "@/components/core";

export async function AuthButtons() {
  const session = await getPageSession();

  if (session?.account) {
    return <AccountDropdown session={session} />;
  }

  if (session && !session.account) {
    return (
      <Callout.Root color="yellow">
        <Callout.Icon>
          <ExclamationTriangleIcon />
        </Callout.Icon>
        <Callout.Text>
          You do not yet have a profile. Please click{" "}
          <Link href={onboardingUrl()}>here</Link> to complete your profile.
        </Callout.Text>
      </Callout.Root>
    );
  }

  return <LoginButton />;
}
