import { Flex, Text, type FlexProps } from "@radix-ui/themes";
import { formatBytes } from "@/lib/format";
import type { CatalogEntry } from "@/types/catalog";

export function ProductCatalogStats({
  entry,
  px,
}: { entry?: CatalogEntry } & Pick<FlexProps, "px">) {
  if (!entry) return null;
  const formats = Object.entries(entry.exts ?? {})
    .filter(([extension, count]) => extension && count > 0)
    .sort(([a, countA], [b, countB]) => countB - countA || a.localeCompare(b))
    .map(([extension]) => extension.toUpperCase());
  if (
    entry.total_bytes === undefined &&
    entry.object_count === undefined &&
    !formats.length
  ) {
    return null;
  }

  return (
    <Flex gap="3" wrap="wrap" mb="3" px={px} aria-label="Catalog statistics">
      {entry.total_bytes !== undefined && (
        <Text size="2" color="gray">
          {formatBytes(entry.total_bytes)}
        </Text>
      )}
      {entry.object_count !== undefined && (
        <Text size="2" color="gray">
          {entry.object_count.toLocaleString("en-US")}{" "}
          {entry.object_count === 1 ? "object" : "objects"}
        </Text>
      )}
      {formats.length > 0 && (
        <Text size="2" color="gray" title={formats.join(", ")}>
          {formats.slice(0, 3).join(", ")}
          {formats.length > 3 && ` +${formats.length - 3} more`}
        </Text>
      )}
    </Flex>
  );
}
