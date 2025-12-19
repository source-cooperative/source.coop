import { loginUrl } from "@/lib";
import { Box, Container, Flex, Heading, Text, Button } from "@radix-ui/themes";
import Link from "next/link";

export function LandingPage() {
  return (
    <Box className="min-h-screen">
      <Container size="4" py="9">
        <Flex direction="column" gap="9" align="center" className="text-center">
          {/* Hero Section */}
          <Flex direction="column" gap="5" align="center" className="max-w-3xl">
            <Heading size="9" className="font-bold">
              Welcome to Source Cooperative
            </Heading>
            <Text size="5" color="gray" className="max-w-2xl">
              Discover, share, and collaborate on open data products. Join our
              community of data enthusiasts and organizations making data more
              accessible.
            </Text>
            <Flex gap="4" mt="4">
              <Link href={loginUrl()}>
                <Button size="3" variant="solid">
                  Sign In or Register
                </Button>
              </Link>
            </Flex>
          </Flex>

          {/* Features Section */}
          <Box className="w-full max-w-5xl" mt="9">
            <Heading size="6" mb="6" className="text-center">
              Why Source Cooperative?
            </Heading>
            <Flex gap="6" direction={{ initial: "column", md: "row" }}>
              <Box className="flex-1 p-6 rounded-lg border border-gray-200 dark:border-gray-800">
                <Heading size="4" mb="3">
                  Open Data Repository
                </Heading>
                <Text color="gray">
                  Access a curated collection of public datasets and data
                  products from organizations and individuals worldwide.
                </Text>
              </Box>

              <Box className="flex-1 p-6 rounded-lg border border-gray-200 dark:border-gray-800">
                <Heading size="4" mb="3">
                  Easy Collaboration
                </Heading>
                <Text color="gray">
                  Work together with teams and organizations to manage, share,
                  and distribute data products efficiently.
                </Text>
              </Box>

              <Box className="flex-1 p-6 rounded-lg border border-gray-200 dark:border-gray-800">
                <Heading size="4" mb="3">
                  Built for Scale
                </Heading>
                <Text color="gray">
                  Leverage cloud-native infrastructure to store and access data
                  at any scale with S3-compatible storage.
                </Text>
              </Box>
            </Flex>
          </Box>

          {/* CTA Section */}
          <Box className="w-full max-w-3xl mt-9 p-8 rounded-lg bg-gray-100 dark:bg-gray-900">
            <Flex direction="column" gap="4" align="center">
              <Heading size="5">Ready to get started?</Heading>
              <Text color="gray">
                Create a free account and start exploring our data products
                today.
              </Text>
              <Link href={loginUrl()}>
                <Button size="3" variant="solid">
                  Get Started
                </Button>
              </Link>
            </Flex>
          </Box>
        </Flex>
      </Container>
    </Box>
  );
}
