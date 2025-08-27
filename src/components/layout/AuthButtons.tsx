import { AccountDropdown } from "./AccountDropdown";
import { getPageSession } from "@/lib/api/utils";
import { LoginButton } from "./LoginButton";

export async function AuthButtons() {
  const session = await getPageSession();

  if (session?.account) {
    return <AccountDropdown account={session.account} />;
  }

  return <LoginButton session={session} />;
}
