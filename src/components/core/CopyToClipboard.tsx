"use client"
import { useState } from "react";
import { CheckIcon, CopyIcon } from "@radix-ui/react-icons";
import { IconButton, Tooltip } from "@radix-ui/themes";
import { useTranslations } from "next-intl";

interface CopyToClipboardProps {
  text: string | undefined;
}

export function CopyToClipboard({ text }: CopyToClipboardProps) {
  const t = useTranslations("CopyToClipboard");
  const [copied, setCopied] = useState(false);
  const copyToClipboard = (text: string | undefined) => {
    navigator.clipboard.writeText(text || "").then(() => {
      setCopied(true);

      // Reset the copied state after animation time
      setTimeout(() => {
        setCopied(false);
      }, 1500);
    });
  };

  return (
    <Tooltip content={t("copyToClipboard")}>
      <IconButton
        type="button"
        size="1"
        variant="ghost"
        color={copied ? "green" : "gray"}
        onClick={() => copyToClipboard(text)}
        aria-label={t("copyToClipboard")}
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
      </IconButton>
    </Tooltip>
  );
}
