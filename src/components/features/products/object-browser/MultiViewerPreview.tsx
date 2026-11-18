"use client";

import { useState } from "react";
import { Flex, SegmentedControl } from "@radix-ui/themes";
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
      <Flex justify="end">
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
      </Flex>
      <PreviewIframe src={active.url} title={`${title} — ${active.label} viewer`} />
    </Flex>
  );
}
