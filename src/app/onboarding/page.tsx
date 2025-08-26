import { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getServerSession } from "@ory/nextjs/app";
import { Container, Box, Heading, Text } from "@radix-ui/themes";
import { OnboardingForm } from "@/components/features/onboarding/OnboardingForm";

export const metadata: Metadata = {
  title: "Complete Your Profile",
  description: "Choose your username and set up your profile",
};

export default async function OnboardingPage() {
  return (
    <Container size="2" pt="8" pb="9">
      <Box className="mx-auto max-w-md">
        <Heading size="6" mb="3">
          Complete Your Profile
        </Heading>

        <Text size="2" color="gray" mb="6">
          You&apos;re almost done! Choose a username for your account and tell
          us your name.
        </Text>

        <Suspense>
          <OnboardingForm />
        </Suspense>
      </Box>
    </Container>
  );
}
