import { Tooltip } from "@radix-ui/themes";
import { MinusCircledIcon, CheckCircledIcon } from "@radix-ui/react-icons";
import type { AccountEmail } from "@/types";
import { useFormatter, useTranslations } from "next-intl";

interface EmailVerificationStatusProps {
  email?: AccountEmail;
}

export function EmailVerificationStatus({ email }: EmailVerificationStatusProps) {
  const t = useTranslations("EmailVerificationStatus");
  const format = useFormatter();
  return (
    <Tooltip
      content={
        email?.verified_at
          ? t("verifiedOn", {
              date: format.dateTime(new Date(email.verified_at), {
                year: "numeric",
                month: "short",
                day: "numeric",
              }),
            })
          : t("notVerified")
      }
    >
      {email?.verified ? (
        <CheckCircledIcon color="green" width="16" height="16" />
      ) : (
        <MinusCircledIcon color="gray" width="16" height="16" />
      )}
    </Tooltip>
  );
}
