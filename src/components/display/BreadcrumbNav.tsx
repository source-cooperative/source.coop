"use client";

import { Flex } from "@radix-ui/themes";
import Link from "next/link";
import { ChevronRightIcon } from "@radix-ui/react-icons";
import { MonoText } from "@/components/core";

interface BreadcrumbNavProps {
  path: string[];
  fileName?: string;
  baseUrl?: string;
}

export function BreadcrumbNav({
  path,
  fileName,
  baseUrl = "",
}: BreadcrumbNavProps) {
  const isRoot = path.length === 0 && !fileName;

  // Create link styling that doesn't affect layout
  const linkStyle = {
    color: "var(--gray-11)",
    textDecorationThickness: "1px",
  };

  // Function to render a path segment
  const renderSegment = (
    segment: string,
    index: number,
    isClickable: boolean = true
  ) => (
    <Flex key={`${index}-${segment}`} align="center" gap="1">
      <ChevronRightIcon />
      <div style={{ lineHeight: "22px" }}>
        {!isClickable ? (
          <MonoText size="2" color="gray">
            {segment}
          </MonoText>
        ) : (
          <Link
            href={`${baseUrl}/${path.slice(0, index + 1).join("/")}`}
            style={linkStyle}
          >
            <MonoText size="2">{segment}</MonoText>
          </Link>
        )}
      </div>
    </Flex>
  );

  // Determine which segments to show
  const MAX_VISIBLE_SEGMENTS = 4; // Show at most 2 at start and 2 at end
  let visibleSegments: JSX.Element[] = [];

  if (path.length > 0) {
    if (path.length <= MAX_VISIBLE_SEGMENTS) {
      // Show all segments if path is short enough
      visibleSegments = path.map((segment, index) =>
        renderSegment(
          segment,
          index,
          !(index === path.length - 1) || Boolean(fileName)
        )
      );
    } else {
      // Show first 2 and last 2 segments with ellipsis
      const firstSegments = path
        .slice(0, 2)
        .map((segment, index) => renderSegment(segment, index));

      const lastSegments = path
        .slice(-2)
        .map((segment, index) =>
          renderSegment(
            segment,
            path.length - 2 + index,
            !(index === 1) || Boolean(fileName)
          )
        );

      visibleSegments = [
        ...firstSegments,
        <Flex key="ellipsis" align="center" gap="1">
          <ChevronRightIcon />
          <div style={{ lineHeight: "22px" }}>
            <MonoText size="2" color="gray">
              ...
            </MonoText>
          </div>
        </Flex>,
        ...lastSegments,
      ];
    }
  }

  return (
    <Flex>
      {/* Root link */}
      <div style={{ lineHeight: "22px" }}>
        {isRoot ? (
          <MonoText size="2" color="gray">
            root
          </MonoText>
        ) : (
          <Link href={baseUrl || "/"} style={linkStyle}>
            <MonoText size="2">root</MonoText>
          </Link>
        )}
      </div>

      {/* Path segments with possible truncation */}
      {visibleSegments}

      {/* File name */}
      {fileName && (
        <Flex align="center" gap="1">
          <ChevronRightIcon />
          <div style={{ lineHeight: "22px" }}>
            <MonoText size="2" color="gray">
              {fileName}
            </MonoText>
          </div>
        </Flex>
      )}
    </Flex>
  );
}
