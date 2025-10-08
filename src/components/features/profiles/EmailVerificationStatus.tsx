import { Tooltip } from "@radix-ui/themes";
import { MinusCircledIcon, CheckCircledIcon } from "@radix-ui/react-icons";
import type { AccountEmail } from "@/types";
import { formatDate } from "@/lib/format";

interface EmailVerificationStatusProps {
  email?: AccountEmail;
}

export function EmailVerificationStatus({ email }: EmailVerificationStatusProps) {
  return (
    <Tooltip
      content={
        email?.verified_at
          ? `Email verified on ${formatDate(email.verified_at)}`
          : "Email not verified"
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
