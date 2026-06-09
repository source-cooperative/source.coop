import { Box, Callout, Link } from "@radix-ui/themes";
import { CheckCircledIcon, InfoCircledIcon } from "@radix-ui/react-icons";
import { verifyEmailUrl } from "@/lib";
import type { EmailVerificationState } from "@/lib/api/utils";

interface EmailVerificationCalloutProps {
  /**
   * Which banner to render. "unverified" shows a reminder to verify;
   * "just-verified" thanks the user for confirming their email.
   */
  status: EmailVerificationState;
}

export function EmailVerificationCallout({
  status,
}: EmailVerificationCalloutProps) {
  return (
    <Box mb="6">
      {status === "unverified" ? (
        <Callout.Root color="blue">
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text>
            Please check your email. We&apos;ve sent you a code to verify your
            email address. Or, you can click{" "}
            <Link href={verifyEmailUrl()}>here</Link> to verify your email
            address.
          </Callout.Text>
        </Callout.Root>
      ) : (
        <Callout.Root color="green">
          <Callout.Icon>
            <CheckCircledIcon />
          </Callout.Icon>
          <Callout.Text>
            Your email has been successfully verified. Thank you for confirming
            your account.
          </Callout.Text>
        </Callout.Root>
      )}
    </Box>
  );
}
