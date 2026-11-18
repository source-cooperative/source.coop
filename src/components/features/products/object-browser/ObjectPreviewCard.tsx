import type { ReactNode } from "react";
import { Box, Flex, Link } from "@radix-ui/themes";
import { ExternalLinkIcon } from "@radix-ui/react-icons";
import { SectionHeader } from "@/components/core/SectionHeader";

interface ObjectPreviewCardProps {
  /** Viewer URL for the "Open in new tab" link; omit when no external viewer exists. */
  viewerUrl: string | null;
  /**
   * When a format has multiple viewers, pass labeled links here instead of
   * `viewerUrl`. Each link renders with its own label and an external-link icon.
   * When both `viewerLinks` and `viewerUrl` are set, `viewerLinks` takes precedence.
   */
  viewerLinks?: { url: string; label: string }[];
  /** Short description of the detected format, e.g. "Zarr v2" or "COG". */
  label: string | null;
  children?: ReactNode;
}

/**
 * Header and body shell for the Object Preview card. The format label is
 * centered in the header row between the "Object Preview" title and an
 * "Open in new tab" link (when a viewer URL is supplied).
 */
export function ObjectPreviewCard({
  viewerUrl,
  viewerLinks,
  label,
  children,
}: ObjectPreviewCardProps) {
  const links =
    viewerLinks && viewerLinks.length > 0 ? viewerLinks : null;

  return (
    <SectionHeader
      title="Object Preview"
      label={label ?? undefined}
      rightButton={
        links ? (
          <Flex align="center" gap="3">
            {links.map(({ url, label: linkLabel }) => (
              <Link
                key={url}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                size="1"
              >
                <Flex align="center" gap="1">
                  {linkLabel}
                  <ExternalLinkIcon width="14" height="14" />
                </Flex>
              </Link>
            ))}
          </Flex>
        ) : viewerUrl ? (
          <Link
            href={viewerUrl}
            target="_blank"
            rel="noopener noreferrer"
            size="1"
          >
            <Flex align="center" gap="1">
              Open in new tab
              <ExternalLinkIcon width="14" height="14" />
            </Flex>
          </Link>
        ) : null
      }
    >
      <Box mt="4">{children}</Box>
    </SectionHeader>
  );
}
