/**
 * This page is shown when a user has verified their email address. Its primary pupose
 * is to update the user's account with the verified email addresses from Ory.
 */

import { Button, Text, Flex, Box, Heading, Card } from "@radix-ui/themes";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { redirect } from "next/navigation";
import { accountUrl, homeUrl, onboardingUrl, verifyEmailUrl } from "@/lib/urls";
import { getPageSession } from "@/lib/api/utils";
import { accountsTable } from "@/lib";
import Link from "next/link";

export default async function EmailVerifiedPage() {
  const session = await getPageSession();
  if (!session) {
    redirect(homeUrl());
  }
  if (!session.account) {
    redirect(onboardingUrl());
  }
  const verifiedAddresses = session.orySession?.identity?.verifiable_addresses;

  if (verifiedAddresses?.some((address) => address.verified)) {
    await accountsTable.update({
      ...session.account,

      // Copy over the verified email addresses from Ory
      emails: verifiedAddresses?.map((address, index) => ({
        address: address.value,
        verified: address.verified,
        is_primary: index === 0,
        added_at: (address.created_at || new Date()).toISOString(),
        verified_at: (address.verified_at || new Date()).toISOString(),
      })),
    });
    redirect(accountUrl(session.account.account_id) + "?verified");
  }

  return (
    <>
      <Box mb="4">
        <ExclamationTriangleIcon
          width={48}
          height={48}
          style={{ color: "var(--gray-9)" }}
        />
      </Box>

      <Heading size="6" mb="3" align="center">
        Email Verification Required
      </Heading>

      <Text
        size="3"
        color="gray"
        align="center"
        mb="4"
        style={{ maxWidth: "500px" }}
      >
        We couldn&apos;t verify your email address. Please check your email and
        click the verification link, or try again.
      </Text>

      <Card size="2" mb="4" style={{ width: "100%", maxWidth: "400px" }}>
        {verifiedAddresses && verifiedAddresses.length > 0 && (
          <Box p="3">
            <Text size="2" weight="medium" mb="2" color="gray">
              Unverified email addresses:
            </Text>
            <Flex direction="column" gap="2">
              {verifiedAddresses.map((address) => (
                <Box
                  key={address.value}
                  p="2"
                  style={{
                    backgroundColor: "var(--gray-2)",
                    borderRadius: "var(--radius-2)",
                    border: "1px solid var(--gray-4)",
                  }}
                >
                  <Text
                    size="2"
                    style={{ fontFamily: "var(--code-font-family)" }}
                  >
                    {address.value}
                  </Text>
                </Box>
              ))}
            </Flex>
          </Box>
        )}
      </Card>

      <Flex gap="3" align="center">
        <Button asChild size="2">
          <Link href={verifyEmailUrl()}>Verify Email</Link>
        </Button>
        <Button asChild variant="soft" size="2">
          <Link href={accountUrl(session.account.account_id)}>
            Back to Account
          </Link>
        </Button>
      </Flex>
    </>
  );
}
