import { Flex, Heading, Text, Table, Badge, Code } from "@radix-ui/themes";
import Link from "next/link";
import { productsTable } from "@/lib/clients";
import { productUrl } from "@/lib/urls";

/**
 * Lists the products that mirror data through a given data connection. The
 * lookup is a full product-table scan (see
 * ProductsTable.listProductsByConnectionId), so render this inside <Suspense>
 * to keep it off the form's critical path.
 */
export async function ConnectionUsage({
  connectionId,
}: {
  connectionId: string;
}) {
  const products = await productsTable.listProductsByConnectionId(connectionId);

  return (
    <Flex direction="column" gap="3">
      <Heading size="4">Products using this connection</Heading>

      {products.length === 0 ? (
        <Text size="2" color="gray">
          No products use this connection.
        </Text>
      ) : (
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell>Product</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Primary</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Disabled</Table.ColumnHeaderCell>
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
                    <Flex direction="column" gap="1">
                      <Link
                        href={productUrl(
                          product.account_id,
                          product.product_id
                        )}
                        style={{ color: "var(--accent-11)" }}
                      >
                        {product.title || product.product_id}
                      </Link>
                      <Code size="1" variant="ghost" color="gray">
                        {product.account_id}/{product.product_id}
                      </Code>
                    </Flex>
                  </Table.Cell>
                  <Table.Cell>
                    {isPrimary ? (
                      <Badge color="green">Primary</Badge>
                    ) : (
                      <Text size="2" color="gray">
                        -
                      </Text>
                    )}
                  </Table.Cell>
                  <Table.Cell>
                    {product.disabled ? (
                      <Badge color="red">Disabled</Badge>
                    ) : (
                      <Badge color="gray" variant="soft">
                        Active
                      </Badge>
                    )}
                  </Table.Cell>
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table.Root>
      )}
    </Flex>
  );
}
