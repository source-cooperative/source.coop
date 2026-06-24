import { CheckCircledIcon } from "@radix-ui/react-icons";
import { Container, Flex, Heading, Text } from "@radix-ui/themes";

export const metadata = { title: "Device authorized" };

/**
 * Device-success page (`urls.device.success`). Ory lands the browser here after
 * the user has authorized the device; the terminal that started the flow has
 * already received its tokens by this point.
 */
export default function DeviceSuccessPage() {
  return (
    <Container size="1" py="9">
      <Flex direction="column" align="center" gap="3" pt="9">
        <Text color="green" asChild>
          <CheckCircledIcon width="48" height="48" />
        </Text>
        <Heading size="6" align="center">
          You&rsquo;re signed in
        </Heading>
        <Text color="gray" align="center">
          Your device has been authorized. You can close this window and return
          to your terminal.
        </Text>
      </Flex>
    </Container>
  );
}
