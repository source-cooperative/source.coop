import { Callout } from "@radix-ui/themes";
import Link from "next/link";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import { useTranslations } from "next-intl";
import { editAccountProfileUrl } from "@/lib/urls";

interface WelcomeCalloutProps {
  accountId: string;
}

export function WelcomeCallout({ accountId }: WelcomeCalloutProps) {
  const t = useTranslations("WelcomeCallout");
  return (
    <Callout.Root color="blue" mb="6">
      <Callout.Icon>
        <InfoCircledIcon />
      </Callout.Icon>
      <Callout.Text>
        {t.rich("message", {
          link: (chunks) => (
            <Link
              href={editAccountProfileUrl(accountId)}
              style={{ textDecoration: "underline" }}
            >
              {chunks}
            </Link>
          ),
        })}
      </Callout.Text>
    </Callout.Root>
  );
}
