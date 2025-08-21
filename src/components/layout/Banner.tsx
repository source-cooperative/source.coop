"use client";

import { Box, Text } from "@radix-ui/themes";
import Link from "next/link";

export function Banner() {
  return (
    <Box
      style={{
        backgroundColor: "var(--blue-3)",
        padding: "0.5rem 0",
        textAlign: "center",
      }}
    >
      <Text size="2">
        NOTE: We are rebuilding Source Cooperative.{" "}
        <Link
          href="https://survey.source.coop"
          target="_blank"
          rel="noopener noreferrer"
          style={{ textDecoration: "underline" }}
        >
          Please take our survey
        </Link>{" "}
        to guide our improvements.
      </Text>
    </Box>
  );
} 