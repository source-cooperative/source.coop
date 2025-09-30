import { Tooltip } from "@radix-ui/themes";
import { MinusCircledIcon, CheckCircledIcon } from "@radix-ui/react-icons";
import type { AccountEmail } from "@/types";

interface EmailVerificationStatusProps {
  email?: AccountEmail;
}

export function EmailVerificationStatus({ email }: EmailVerificationStatusProps) {
  return (
    <Tooltip
      content={
        email?.verified
          ? `Email verified on ${email.verified_at}`
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
