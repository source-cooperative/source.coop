import { Text, Table } from "@radix-ui/themes";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { productsTable } from "@/lib/clients";
import { productUrl } from "@/lib/urls";
import { SectionHeader } from "@/components/core";
import { ItemList } from "@/components/core/ItemList";

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

  const t = await getTranslations("ConnectionUsage");
  const heading = t("heading", { count: products.length });

  return (
    <SectionHeader title={heading}>
      {products.length === 0 ? (
        <Text size="2" color="gray">
          {t("unused")}
        </Text>
      ) : (
        // `surface` brings the outer border and panel fill with it, so this
        // needs no container of its own. Text stays at Radix's default table
        // size: the mockup's larger type ate most of the page for a handful of
        // rows, and this is a reference table you glance at on the way to
        // deciding something, not the content of the page.
        <Table.Root variant="surface" size="2">
          <Table.Header>
            {/* Radix leaves the header transparent in this variant; the tint is
                what separates labels from the first row without a second rule. */}
            <Table.Row style={{ backgroundColor: "var(--gray-2)" }}>
              <Table.ColumnHeaderCell>{t("columnProduct")}</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>{t("columnRole")}</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>{t("columnStatus")}</Table.ColumnHeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {products.map((product) => {
              const isPrimary =
                product.metadata.mirrors[product.metadata.primary_mirror]
                  ?.connection_id === connectionId;
              return (
                <Table.Row key={`${product.account_id}/${product.product_id}`}>
                  <Table.Cell>
                    {/* Dark and unadorned rather than the global accent-and-
                        underline link treatment: in a column of nothing but
                        product names, underlining every one is noise. */}
                    <Link
                      href={productUrl(product.account_id, product.product_id)}
                      style={{
                        color: "var(--gray-12)",
                        textDecoration: "none",
                      }}
                    >
                      <Text size="2">{product.title || product.product_id}</Text>
                    </Link>
                    {/* Identifiers in the code face, exactly as a
                        <ItemList.Row>'s meta line renders them. */}
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
                      <ItemList.Marker>{t("primary")}</ItemList.Marker>
                    ) : (
                      <Text size="2" color="gray">
                        {t("mirror")}
                      </Text>
                    )}
                  </Table.Cell>
                  <Table.Cell>
                    {/* Deactivated used to be a red badge and active a grey one.
                        Deactivating is a deliberate act, not a fault, and a badge
                        on every row saying "nothing is wrong" is noise. */}
                    {product.disabled ? (
                      <ItemList.Marker>{t("deactivated")}</ItemList.Marker>
                    ) : (
                      <Text size="2">{t("active")}</Text>
                    )}
                  </Table.Cell>
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table.Root>
      )}
    </SectionHeader>
  );
}
