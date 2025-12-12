"use client"
import { useState } from "react";
import { CheckIcon, CopyIcon } from "@radix-ui/react-icons";
import { IconButton, Tooltip } from "@radix-ui/themes";

interface CopyToClipboardProps {
  text: string | undefined;
}

export function CopyToClipboard({ text }: CopyToClipboardProps) {
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
    <Tooltip content="Copy to clipboard">
      <IconButton
        size="1"
        variant="ghost"
        color={copied ? "green" : "gray"}
        onClick={() => copyToClipboard(text)}
        aria-label="Copy to clipboard"
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
      </IconButton>
    </Tooltip>
  );
}
