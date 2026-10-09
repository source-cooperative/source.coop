import { Box, Callout, Link } from "@radix-ui/themes";
import { CheckCircledIcon, InfoCircledIcon } from "@radix-ui/react-icons";
import { verifyEmailUrl } from "@/lib";
import { useTranslations } from "next-intl";

/**
 * Which banner to render. "unverified" shows a reminder to verify;
 * "just-verified" thanks the user for confirming their email.
 */
export type EmailVerificationState = "unverified" | "just-verified";

interface EmailVerificationCalloutProps {
  status: EmailVerificationState;
}

export function EmailVerificationCallout({
  status,
}: EmailVerificationCalloutProps) {
  const t = useTranslations("EmailVerificationCallout");
  return (
    <Box mb="6">
      {status === "unverified" ? (
        <Callout.Root color="blue">
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text>
            {t.rich("unverified", {
              link: (chunks) => <Link href={verifyEmailUrl()}>{chunks}</Link>,
            })}
          </Callout.Text>
        </Callout.Root>
      ) : (
        <Callout.Root color="green">
          <Callout.Icon>
            <CheckCircledIcon />
          </Callout.Icon>
          <Callout.Text>
            {t("justVerified")}
          </Callout.Text>
        </Callout.Root>
      )}
    </Box>
  );
}
