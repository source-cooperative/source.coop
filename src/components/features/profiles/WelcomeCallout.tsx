'use client';

import { Callout } from '@radix-ui/themes';
import Link from 'next/link';
import { InfoCircledIcon } from '@radix-ui/react-icons';

interface WelcomeCalloutProps {
  show: boolean;
  accountId: string;
}

export function WelcomeCallout({ show, accountId }: WelcomeCalloutProps) {
  if (!show) return null;

  return (
    <Callout.Root color="blue" mb="6">
      <Callout.Icon>
        <InfoCircledIcon />
      </Callout.Icon>
      <Callout.Text>
        Welcome to Source Cooperative. This is your profile page.{' '}
        <Link href={`/${accountId}/edit`} style={{ textDecoration: 'underline' }}>
          Edit it to add more details
        </Link>.
      </Callout.Text>
    </Callout.Root>
  );
} 