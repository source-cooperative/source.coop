import { Card, Table, Text } from "@radix-ui/themes";
import { formatBytes } from "@/lib/format";
import type { CatalogEntry } from "@/types/catalog";

export function hasCatalogStats(entry?: CatalogEntry): entry is CatalogEntry {
  return !!entry && (
    entry.total_bytes !== undefined ||
    entry.object_count !== undefined ||
    Object.values(entry.exts ?? {}).some((count) => count > 0) ||
    Object.values(entry.ext_bytes ?? {}).some((bytes) => bytes > 0)
  );
}

function Share({ value, total }: { value?: number; total?: number }) {
  if (value === undefined || total === undefined || total <= 0) return null;
  return (
    <Text as="div" size="1" color="gray">
      {((value / total) * 100).toLocaleString("en-US", { maximumFractionDigits: 1 })}%
    </Text>
  );
}

export function ProductCatalogStats({ entry }: { entry?: CatalogEntry }) {
  if (!hasCatalogStats(entry)) return null;
  const extensions = [...new Set([
    ...Object.keys(entry.exts ?? {}),
    ...Object.keys(entry.ext_bytes ?? {}),
  ])]
    .filter((extension) =>
      (entry.exts?.[extension] ?? 0) > 0 || (entry.ext_bytes?.[extension] ?? 0) > 0
    )
    .sort((a, b) =>
      (entry.exts?.[b] ?? 0) - (entry.exts?.[a] ?? 0) || a.localeCompare(b)
    )
    .slice(0, 3);
  const files = (count?: number) =>
    count === undefined ? "—" : count.toLocaleString("en-US");
  const bytes = (size?: number) => size === undefined ? "—" : formatBytes(size);
  const exactBytes = (size?: number) =>
    size === undefined ? undefined : `${size.toLocaleString("en-US")} bytes`;

  return (
    <Card aria-label="Catalog summary">
      <Table.Root size="1" style={{ fontVariantNumeric: "tabular-nums" }}>
        <caption style={{
          captionSide: "bottom",
          textAlign: "left",
          fontSize: "var(--font-size-1)",
          color: "var(--gray-11)",
        }}>
          Percentages use whole-product totals.
        </caption>
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeaderCell>Extension</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell justify="end">Files</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell justify="end">Bytes</Table.ColumnHeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {extensions.map((extension) => (
            <Table.Row key={extension}>
              <Table.RowHeaderCell style={{ overflowWrap: "anywhere" }}>
                {extension ? extension.toLowerCase() : "No extension"}
              </Table.RowHeaderCell>
              <Table.Cell justify="end">
                {files(entry.exts?.[extension])}
                <Share value={entry.exts?.[extension]} total={entry.object_count} />
              </Table.Cell>
              <Table.Cell justify="end" title={exactBytes(entry.ext_bytes?.[extension])}>
                {bytes(entry.ext_bytes?.[extension])}
                <Share value={entry.ext_bytes?.[extension]} total={entry.total_bytes} />
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
        <tfoot>
          <Table.Row style={{ fontWeight: "bold" }}>
            <Table.RowHeaderCell>Total (all files)</Table.RowHeaderCell>
            <Table.Cell justify="end">
              {files(entry.object_count)}
              <Share value={entry.object_count} total={entry.object_count} />
            </Table.Cell>
            <Table.Cell justify="end" title={exactBytes(entry.total_bytes)}>
              {bytes(entry.total_bytes)}
              <Share value={entry.total_bytes} total={entry.total_bytes} />
            </Table.Cell>
          </Table.Row>
        </tfoot>
      </Table.Root>
    </Card>
  );
}
