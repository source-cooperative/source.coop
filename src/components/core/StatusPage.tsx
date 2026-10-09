import {
  Box,
  Container,
  Heading,
  Text,
  Flex,
  Link as RadixLink,
} from "@radix-ui/themes";
import Link from "next/link";
import {
  LinkBreak2Icon,
  LockClosedIcon,
  PersonIcon,
} from "@radix-ui/react-icons";
import { ReactNode } from "react";
import { useTranslations } from "next-intl";

type StatusType = "not-found" | "not-authorized" | "unauthenticated";

interface StatusPageProps {
  type: StatusType;
  title?: string;
  description?: ReactNode;
  actionText?: ReactNode;
  actionHref?: string;
  /** Custom action node (e.g. a client button); overrides actionText/actionHref. */
  action?: ReactNode;
  iconSize?: number;
  containerSize?: "1" | "2" | "3" | "4";
  minHeight?: string;
}

const statusConfig = {
  "not-found": {
    icon: LinkBreak2Icon,
    titleKey: "notFoundTitle",
    descriptionKey: "notFoundDescription",
  },
  "not-authorized": {
    icon: LockClosedIcon,
    titleKey: "notAuthorizedTitle",
    descriptionKey: "notAuthorizedDescription",
  },
  unauthenticated: {
    icon: PersonIcon,
    titleKey: "unauthenticatedTitle",
    descriptionKey: "unauthenticatedDescription",
  },
} as const;

export function StatusPage({
  type,
  title,
  description,
  actionText,
  actionHref,
  action,
  iconSize = 48,
  containerSize,
  minHeight = "60vh",
}: StatusPageProps) {
  const t = useTranslations("StatusPage");
  const config = statusConfig[type];
  const IconComponent = config.icon;

  const finalTitle = title || t(config.titleKey);
  const finalDescription =
    description || t.rich(config.descriptionKey, { br: () => <br /> });
  const finalActionText = actionText || t("returnHome");
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

        {action ? (
          <Box mt="5">{action}</Box>
        ) : (
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
