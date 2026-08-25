import { Text, Table } from "@radix-ui/themes";
import Link from "next/link";
import { productsTable } from "@/lib/clients";
import { productUrl } from "@/lib/urls";
import { SectionHeader } from "@/components/core";
import { ConnectionList, ConnectionMarker } from "./ConnectionRow";

/**
 * Column label. Same uppercase, letter-spaced, quiet treatment as
 * <ConnectionMarker>, so headings and state labels read as one family instead
 * of Radix's sentence-case default sitting next to hand-styled chips.
 */
function ColumnLabel({ children }: { children: React.ReactNode }) {
  return (
    <Table.ColumnHeaderCell>
      <Text
        size="1"
        color="gray"
        weight="regular"
        style={{ textTransform: "uppercase", letterSpacing: "0.04em" }}
      >
        {children}
      </Text>
    </Table.ColumnHeaderCell>
  );
}

/**
 * Lists the products that mirror data through a given data connection. The
 * lookup is a full product-table scan (see
 * ProductsTable.listProductsByConnectionId), so render this inside <Suspense>
 * to keep it off the form's critical path.
 *
 * This answers "can I delete this connection?", so it renders above the control
 * that asks — and the count goes in the heading, since that is the part being
 * looked for.
 */
export async function ConnectionUsage({
  connectionId,
}: {
  connectionId: string;
}) {
  const products = await productsTable.listProductsByConnectionId(connectionId);

  const heading =
    products.length === 1
      ? "Used by 1 product"
      : `Used by ${products.length} products`;

  return (
    <SectionHeader title={heading}>
      {products.length === 0 ? (
        <Text size="2" color="gray">
          Nothing uses this connection, so it can be deleted.
        </Text>
      ) : (
        // The same bordered box the connection lists use — this is another list
        // of connection-shaped things on the same page, and two different
        // container treatments would read as two different kinds of content.
        <ConnectionList>
          <Table.Root variant="ghost" size="1">
            <Table.Header>
              <Table.Row>
                <ColumnLabel>Product</ColumnLabel>
                <ColumnLabel>Role</ColumnLabel>
                <ColumnLabel>Status</ColumnLabel>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {products.map((product) => {
                const isPrimary =
                  product.metadata.mirrors[product.metadata.primary_mirror]
                    ?.connection_id === connectionId;
                return (
                  <Table.Row
                    key={`${product.account_id}/${product.product_id}`}
                  >
                    <Table.Cell>
                      <Link
                        href={productUrl(product.account_id, product.product_id)}
                        style={{ color: "var(--accent-11)" }}
                      >
                        <Text size="2">
                          {product.title || product.product_id}
                        </Text>
                      </Link>
                      {/* Identifiers in the code face, exactly as a
                          <ConnectionRow>'s meta line renders them. */}
                      <Text
                        size="1"
                        color="gray"
                        style={{
                          fontFamily: "var(--code-font-family)",
                          display: "block",
                          wordBreak: "break-all",
                        }}
                      >
                        {product.account_id}/{product.product_id}
                      </Text>
                    </Table.Cell>
                    <Table.Cell>
                      {/* Primary is the one served from, so it is marked; being a
                          mirror is the ordinary case and stays plain. */}
                      {isPrimary ? (
                        <ConnectionMarker>Primary</ConnectionMarker>
                      ) : (
                        <Text size="2" color="gray">
                          Mirror
                        </Text>
                      )}
                    </Table.Cell>
                    <Table.Cell>
                      {/* Deactivated used to be a red badge and active a grey one.
                          Deactivating is a deliberate act, not a fault, and a badge
                          on every row saying "nothing is wrong" is noise. */}
                      {product.disabled ? (
                        <ConnectionMarker>Deactivated</ConnectionMarker>
                      ) : (
                        <Text size="2">Active</Text>
                      )}
                    </Table.Cell>
                  </Table.Row>
                );
              })}
            </Table.Body>
          </Table.Root>
        </ConnectionList>
      )}
    </SectionHeader>
  );
}
