import { getLogoutFlow } from "@ory/nextjs/app";
import { redirect } from "next/navigation";

export default async function LogoutPage() {
  const flow = await getLogoutFlow({
    returnTo: "/",
  });

  if (!flow) {
    return null;
  }

  // Redirect to the logout URL
  redirect(flow.logout_url);
}
