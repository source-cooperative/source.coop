"use client";

import { useState } from "react";
import { Flex, Link, SegmentedControl } from "@radix-ui/themes";
import { ExternalLinkIcon } from "@radix-ui/react-icons";
import { PreviewIframe } from "./PreviewIframe";

export interface Viewer {
  url: string;
  label: string;
}

interface MultiViewerPreviewProps {
  viewers: Viewer[];
  title: string;
}

/**
 * Embeds two or more external viewers for the same object, with a segmented
 * control that swaps which one is displayed. Used when probing identifies
 * multiple applicable viewers (e.g. STAC GeoParquet: map and table).
 */
export function MultiViewerPreview({ viewers, title }: MultiViewerPreviewProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = viewers[activeIndex];

  return (
    <Flex direction="column" gap="3">
      <Flex justify="between" align="center">
        <SegmentedControl.Root
          value={String(activeIndex)}
          onValueChange={(v) => setActiveIndex(Number(v))}
          size="1"
        >
          {viewers.map(({ label }, i) => (
            <SegmentedControl.Item key={label} value={String(i)}>
              {label}
            </SegmentedControl.Item>
          ))}
        </SegmentedControl.Root>
        <Link
          href={active.url}
          target="_blank"
          rel="noopener noreferrer"
          size="1"
        >
          <Flex align="center" gap="1">
            Open in new tab
            <ExternalLinkIcon width="14" height="14" />
          </Flex>
        </Link>
      </Flex>
      <PreviewIframe src={active.url} title={`${title} — ${active.label} viewer`} />
    </Flex>
  );
}
