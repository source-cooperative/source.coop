import { Text, Flex, Box, Heading, Card, Skeleton } from "@radix-ui/themes";

export default function EmailVerifiedLoading() {
  return (
    <>
      <Box mb="4">
        <Skeleton width="48px" height="48px" style={{ borderRadius: "50%" }} />
      </Box>

      <Heading size="6" mb="3" align="center">
        <Skeleton width="280px" height="32px" />
      </Heading>

      <Text
        size="3"
        color="gray"
        align="center"
        mb="4"
        style={{ maxWidth: "500px" }}
      >
        <Skeleton width="400px" height="20px" />
      </Text>

      <Card size="2" mb="4" style={{ width: "100%", maxWidth: "400px" }}>
        <Box p="3">
          <Skeleton>
            <Text size="2" weight="medium" mb="2" color="gray">
              Unverified email addresses:
            </Text>
          </Skeleton>
          <Flex direction="column" gap="2">
            <Box
              p="2"
              style={{
                backgroundColor: "var(--gray-2)",
                borderRadius: "var(--radius-2)",
                border: "1px solid var(--gray-4)",
              }}
            >
              <Skeleton>
                <Text
                  size="2"
                  style={{ fontFamily: "var(--code-font-family)" }}
                >
                  test@example.com
                </Text>
              </Skeleton>
            </Box>
          </Flex>
        </Box>
      </Card>

      <Flex gap="3" align="center">
        <Skeleton width="120px" height="36px" style={{ borderRadius: "6px" }} />
        <Skeleton width="140px" height="36px" style={{ borderRadius: "6px" }} />
      </Flex>
    </>
  );
}
