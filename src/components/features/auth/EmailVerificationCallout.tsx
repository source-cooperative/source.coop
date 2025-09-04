"use client";

import { Box, Callout } from "@radix-ui/themes";
import { CheckCircledIcon, InfoCircledIcon } from "@radix-ui/react-icons";
import { useSearchParams } from "next/navigation";

interface EmailVerificationCalloutProps {
  showCheckEmail?: boolean;
}

export function EmailVerificationCallout({
  showCheckEmail = false,
}: EmailVerificationCalloutProps) {
  const searchParams = useSearchParams();
  const isVerified = searchParams.has("verified");

  return (
    <Box mb="6">
      {!isVerified || showCheckEmail ? (
        <Callout.Root color="blue">
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text>
            Please check your email. We&apos;ve sent you a code to verify your
            email address.
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
