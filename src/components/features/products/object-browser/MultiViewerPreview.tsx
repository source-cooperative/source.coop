"use client";

import { useState } from "react";
import { Box, Card, Flex, Link, SegmentedControl } from "@radix-ui/themes";
import { ExternalLinkIcon } from "@radix-ui/react-icons";
import { SectionHeader } from "@/components/core/SectionHeader";
import { PreviewIframe } from "./PreviewIframe";

export interface Viewer {
  url: string;
  label: string;
}

interface MultiViewerPreviewProps {
  viewers: Viewer[];
  /** Short format label shown in the header centre, e.g. "STAC GeoParquet". */
  formatLabel: string | null;
  title: string;
}

/**
 * Full preview card for objects with multiple applicable viewers. The card
 * header shows the format label in the centre and a viewer switcher plus
 * "Open in new tab" link on the right; both update together as the active
 * viewer changes.
 */
export function MultiViewerPreview({ viewers, formatLabel, title }: MultiViewerPreviewProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = viewers[activeIndex];

  return (
    <Card id="preview" mt="4">
      <SectionHeader
        title="Object Preview"
        label={formatLabel ?? undefined}
        rightButton={
          <Flex align="center" gap="3">
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
        }
      >
        <Box mt="4">
          <PreviewIframe src={active.url} title={`${title} — ${active.label} viewer`} />
        </Box>
      </SectionHeader>
    </Card>
  );
}
