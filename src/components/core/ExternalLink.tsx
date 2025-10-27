import { ReactNode } from "react";
import { Flex, Text } from "@radix-ui/themes";
import { ExternalLinkIcon } from "@radix-ui/react-icons";
import Link from "next/link";

interface ExternalLinkProps {
  href: string;
  children: ReactNode;
  useNextLink?: boolean;
}

export function ExternalLink({ href, children }: ExternalLinkProps) {
  const content = (
    <Flex align="center" gap="2">
      <Text size="1">{children}</Text>
      <ExternalLinkIcon width="14" height="14" />
    </Flex>
  );

  return <Link href={href}>{content}</Link>;
}
