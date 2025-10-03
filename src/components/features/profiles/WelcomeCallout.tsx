import { Callout } from "@radix-ui/themes";
import Link from "next/link";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import { editAccountProfileUrl } from "@/lib/urls";

interface WelcomeCalloutProps {
  accountId: string;
}

export function WelcomeCallout({ accountId }: WelcomeCalloutProps) {
  return (
    <Callout.Root color="blue" mb="6">
      <Callout.Icon>
        <InfoCircledIcon />
      </Callout.Icon>
      <Callout.Text>
        Welcome to Source Cooperative. This is your profile page.{" "}
        <Link
          href={editAccountProfileUrl(accountId)}
          style={{ textDecoration: "underline" }}
        >
          Edit it to add more details
        </Link>
        .
      </Callout.Text>
    </Callout.Root>
  );
}
