import {
  Button,
  Callout,
  Card,
  Container,
  Flex,
  Heading,
  Text,
  TextField,
} from "@radix-ui/themes";
import { acceptDeviceCode } from "./actions";

export const metadata = { title: "Verify your device" };

/**
 * Device-verification page (`urls.device.verification`). Ory Hydra redirects
 * here with a `device_challenge`, and `verification_uri_complete` may also pass
 * the `user_code` to pre-fill. Pure Server Component: the form posts straight to
 * the `acceptDeviceCode` server action.
 */
export default async function DevicePage({
  searchParams,
}: {
  searchParams: Promise<{
    device_challenge?: string;
    user_code?: string;
    error?: string;
  }>;
}) {
  const { device_challenge, user_code, error } = await searchParams;

  if (!device_challenge) {
    return (
      <Container size="1" py="9">
        <Heading size="5" mb="2">
          Device verification
        </Heading>
        <Text color="gray">
          This link is missing its verification challenge. Return to your device
          and open the verification URL again.
        </Text>
      </Container>
    );
  }

  return (
    <Container size="1" py="9">
      <Card size="3">
        <Flex direction="column" gap="3">
          <Heading size="5">Verify your device</Heading>
          <Text color="gray" size="2">
            Enter the code shown in your terminal to finish signing in.
          </Text>

          {error && (
            <Callout.Root color="red" role="alert">
              <Callout.Text>
                {error === "invalid"
                  ? "That code is incorrect or has expired. Check your terminal and try again."
                  : "Please enter the code shown in your terminal."}
              </Callout.Text>
            </Callout.Root>
          )}

          <form action={acceptDeviceCode}>
            <input
              type="hidden"
              name="device_challenge"
              defaultValue={device_challenge}
            />
            <Flex direction="column" gap="3">
              <TextField.Root
                name="user_code"
                defaultValue={user_code ?? ""}
                placeholder="ABCD-1234"
                size="3"
                autoFocus
                autoComplete="off"
                spellCheck={false}
                required
                aria-label="Device code"
              />
              <Button type="submit" size="3">
                Continue
              </Button>
            </Flex>
          </form>
        </Flex>
      </Card>
    </Container>
  );
}
