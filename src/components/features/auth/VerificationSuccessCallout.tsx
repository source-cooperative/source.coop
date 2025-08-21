'use client';

import { Callout } from '@radix-ui/themes';
import { CheckCircledIcon } from '@radix-ui/react-icons';
import { useSearchParams } from 'next/navigation';

export function VerificationSuccessCallout() {
  const searchParams = useSearchParams();
  const isVerified = searchParams.get('verified') === 'true';

  if (!isVerified) {
    return null;
  }

  return (
    <Callout.Root color="green">
      <Callout.Icon>
        <CheckCircledIcon />
      </Callout.Icon>
      <Callout.Text>
        Your email has been successfully verified. Thank you for confirming your account.
      </Callout.Text>
    </Callout.Root>
  );
} 