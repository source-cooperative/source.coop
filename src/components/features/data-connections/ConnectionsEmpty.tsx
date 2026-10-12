import { Flex, Text } from "@radix-ui/themes";
import { Link1Icon } from "@radix-ui/react-icons";
import { useTranslations } from "next-intl";

/** Shared empty state, so the two lists cannot drift apart again. */
export function ConnectionsEmpty({ children }: { children: React.ReactNode }) {
  const t = useTranslations("ConnectionsEmpty");
  return (
    <Flex
      direction="column"
      align="center"
      gap="2"
      py="8"
      style={{ userSelect: "none" }}
    >
      <Link1Icon width="48" height="48" color="var(--gray-8)" />
      <Text size="4" weight="medium" color="gray">
        {t("title")}
      </Text>
      <Text size="2" color="gray">
        {children}
      </Text>
    </Flex>
  );
}
