import { AccountDropdown } from "./AccountDropdown";
import { getPageSession } from "@/lib/api/utils";
import { Button, Callout, Link } from "@radix-ui/themes";
import { CONFIG } from "@/lib/config";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";

export async function AuthButtons() {
  const session = await getPageSession();

  if (session?.account) {
    return <AccountDropdown account={session.account} />;
  }

  if (session && !session.account) {
    return (
      <Callout.Root color="yellow">
        <Callout.Icon>
          <ExclamationTriangleIcon />
        </Callout.Icon>
        <Callout.Text>
          You do not yet have a profile. Please click{" "}
          <Link href="/onboarding">here</Link> to complete your profile.
        </Callout.Text>
      </Callout.Root>
    );
  }

  return (
    <Link href={CONFIG.auth.routes.login}>
      <Button>Log In / Register</Button>
    </Link>
  );
}
