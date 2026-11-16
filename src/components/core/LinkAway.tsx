import { ReactNode } from "react";
import { Flex, Text } from "@radix-ui/themes";
import { ChevronRightIcon } from "@radix-ui/react-icons";
import Link from "next/link";

interface LinkAwayProps {
  href: string;
  children: ReactNode;
  useNextLink?: boolean;
}

export function LinkAway({ href, children }: LinkAwayProps) {
  const content = (
    <Flex align="center" gap="2">
      <Text size="1">{children}</Text>
      <ChevronRightIcon width="14" height="14" />
    </Flex>
  );

  return <Link href={href}>{content}</Link>;
}
