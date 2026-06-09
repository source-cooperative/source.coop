import { Metadata } from "next";
import Link from "next/link";
import { Box, Card, Flex, Heading, Text } from "@radix-ui/themes";
import { FormTitle } from "@/components/core";
import { ADMIN_TOOLS } from "@/components/features/admin/tools";

export const metadata: Metadata = {
  title: "Admin",
};

export default function AdminPage() {
  return (
    <Box>
      <FormTitle title="Admin" description="Administrative tools." />
      <Flex direction="column" gap="3">
        {ADMIN_TOOLS.map(({ name, description, href, Icon }) => (
          <Card key={href} asChild>
            <Link href={href} style={{ textDecoration: "none", color: "inherit" }}>
              <Flex align="center" gap="3">
                <Icon width="20" height="20" />
                <Box>
                  <Heading size="3">{name}</Heading>
                  <Text size="2" color="gray">
                    {description}
                  </Text>
                </Box>
              </Flex>
            </Link>
          </Card>
        ))}
      </Flex>
    </Box>
  );
}
