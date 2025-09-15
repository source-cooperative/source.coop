import {
  Container,
  Heading,
  Text,
  Flex,
  Link as RadixLink,
} from "@radix-ui/themes";
import Link from "next/link";
import { LinkBreak2Icon, LockClosedIcon } from "@radix-ui/react-icons";
import { ReactNode } from "react";

type StatusType = "not-found" | "not-authorized";

interface StatusPageProps {
  type: StatusType;
  title?: string;
  description?: ReactNode;
  actionText?: string;
  actionHref?: string;
  iconSize?: number;
  containerSize?: "1" | "2" | "3" | "4";
  minHeight?: string;
  showAction?: boolean;
}

const statusConfig = {
  "not-found": {
    icon: LinkBreak2Icon,
    defaultTitle: "404: Not Found",
    defaultDescription: (
      <>
        We couldn&apos;t find what you&apos;re looking for.
        <br />
        The path may have been moved or no longer exists.
      </>
    ),
  },
  "not-authorized": {
    icon: LockClosedIcon,
    defaultTitle: "403: Not Authorized",
    defaultDescription: (
      <>
        You don&apos;t have permission to access this resource.
        <br />
        Please contact an administrator if you believe this is an error.
      </>
    ),
  },
};

export function StatusPage({
  type,
  title,
  description,
  actionText,
  actionHref,
  iconSize = 48,
  containerSize,
  minHeight = "60vh",
  showAction = true,
}: StatusPageProps) {
  const config = statusConfig[type];
  const IconComponent = config.icon;

  const finalTitle = title || config.defaultTitle;
  const finalDescription = description || config.defaultDescription;
  const finalActionText = actionText || "Return to Homepage";
  const finalActionHref = actionHref || "/";

  return (
    <Container size={containerSize}>
      <Flex
        direction="column"
        align="center"
        justify="center"
        py="9"
        style={{ minHeight }}
      >
        <IconComponent
          width={iconSize}
          height={iconSize}
          style={{ color: "var(--gray-8)" }}
        />

        <Heading size="8" mt="5" align="center">
          {finalTitle}
        </Heading>

        <Text size="4" color="gray" align="center" mt="2">
          {finalDescription}
        </Text>

        {showAction && (
          <RadixLink size="3" mt="5" asChild>
            <Link href={finalActionHref}>{finalActionText}</Link>
          </RadixLink>
        )}
      </Flex>
    </Container>
  );
}

// Convenience components for common use cases
export function NotFoundPage(props: Omit<StatusPageProps, "type">) {
  return <StatusPage type="not-found" {...props} />;
}

export function NotAuthorizedPage(props: Omit<StatusPageProps, "type">) {
  return <StatusPage type="not-authorized" {...props} />;
}
