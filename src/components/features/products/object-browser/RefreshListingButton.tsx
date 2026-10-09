"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ReloadIcon } from "@radix-ui/react-icons";
import { IconButton, Spinner, Tooltip } from "@radix-ui/themes";
import { useTranslations } from "next-intl";

/** Re-fetches the server-rendered listing for the current path. */
export function RefreshListingButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const t = useTranslations("RefreshListingButton");

  return (
    <Tooltip content={t("refresh")}>
      <IconButton
        variant="ghost"
        size="1"
        aria-label={t("refreshListing")}
        disabled={isPending}
        onClick={() => startTransition(() => router.refresh())}
      >
        {isPending ? <Spinner /> : <ReloadIcon />}
      </IconButton>
    </Tooltip>
  );
}
