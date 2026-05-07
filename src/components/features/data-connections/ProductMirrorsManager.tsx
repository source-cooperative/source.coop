"use client";

import { useActionState } from "react";
import {
  Text,
  Table,
  Flex,
  Badge,
  Button,
  Heading,
} from "@radix-ui/themes";
import { Link1Icon } from "@radix-ui/react-icons";
import Form from "next/form";
import { DataConnection, Product } from "@/types";
import {
  addProductMirror,
  removeProductMirror,
  setPrimaryMirror,
} from "@/lib/actions/product-mirrors";

interface ProductMirrorsManagerProps {
  product: Product;
  availableConnections: DataConnection[];
  isAdmin: boolean;
}

export function ProductMirrorsManager({
  product,
  availableConnections,
  isAdmin,
}: ProductMirrorsManagerProps) {
  const [addState, addAction, addPending] = useActionState(addProductMirror, {
    message: "",
    data: new FormData(),
    fieldErrors: {},
    success: false,
  });

  const [removeState, removeAction, removePending] = useActionState(
    removeProductMirror,
    { message: "", data: new FormData(), fieldErrors: {}, success: false }
  );

  const [primaryState, primaryAction, primaryPending] = useActionState(
    setPrimaryMirror,
    { message: "", data: new FormData(), fieldErrors: {}, success: false }
  );

  const mirrors = Object.entries(product.metadata.mirrors);

  const usedConnectionIds = new Set(
    mirrors.map(([_, mirror]) => mirror.connection_id)
  );
  const unusedConnections = availableConnections.filter(
    (conn) => !usedConnectionIds.has(conn.data_connection_id)
  );

  return (
    <Flex direction="column" gap="4">
      <Heading size="4">Data Connections</Heading>

      {mirrors.length === 0 ? (
        <Flex
          direction="column"
          align="center"
          gap="2"
          py="8"
          style={{ userSelect: "none" }}
        >
          <Link1Icon width="48" height="48" color="var(--gray-8)" />
          <Text size="4" weight="medium" color="gray">
            No data connections
          </Text>
          <Text size="2" color="gray">
            {isAdmin
              ? "Add a data connection to this product."
              : "No data connections have been configured for this product."}
          </Text>
        </Flex>
      ) : (
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell>Connection</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Provider</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Region</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Primary</Table.ColumnHeaderCell>
              {isAdmin && (
                <Table.ColumnHeaderCell>Actions</Table.ColumnHeaderCell>
              )}
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {mirrors.map(([key, mirror]) => (
              <Table.Row key={key}>
                <Table.Cell>
                  <Text size="2" style={{ fontFamily: "var(--code-font-family)" }}>
                    {key}
                  </Text>
                </Table.Cell>
                <Table.Cell>
                  <Badge color={mirror.storage_type === "s3" ? "orange" : "blue"}>
                    {mirror.storage_type === "s3" ? "S3" : "Azure"}
                  </Badge>
                </Table.Cell>
                <Table.Cell>
                  <Text size="2">{mirror.config.region || "-"}</Text>
                </Table.Cell>
                <Table.Cell>
                  {mirror.is_primary ? (
                    <Badge color="green">Primary</Badge>
                  ) : isAdmin ? (
                    <Form action={primaryAction} style={{ display: "inline" }}>
                      <input type="hidden" name="account_id" value={product.account_id} />
                      <input type="hidden" name="product_id" value={product.product_id} />
                      <input type="hidden" name="mirror_key" value={key} />
                      <Button type="submit" size="1" variant="soft" disabled={primaryPending} loading={primaryPending}>
                        Set Primary
                      </Button>
                    </Form>
                  ) : (
                    <Text size="2" color="gray">-</Text>
                  )}
                </Table.Cell>
                {isAdmin && (
                  <Table.Cell>
                    <Form action={removeAction} style={{ display: "inline" }}>
                      <input type="hidden" name="account_id" value={product.account_id} />
                      <input type="hidden" name="product_id" value={product.product_id} />
                      <input type="hidden" name="mirror_key" value={key} />
                      <Button type="submit" size="1" variant="soft" color="red" disabled={removePending} loading={removePending}>
                        Remove
                      </Button>
                    </Form>
                  </Table.Cell>
                )}
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      )}

      {removeState.message && (
        <Text size="2" color={removeState.success ? "green" : "red"}>{removeState.message}</Text>
      )}
      {primaryState.message && (
        <Text size="2" color={primaryState.success ? "green" : "red"}>{primaryState.message}</Text>
      )}

      {isAdmin && unusedConnections.length > 0 && (
        <Flex direction="column" gap="2">
          <Text size="3" weight="medium">Add Data Connection</Text>
          <Form action={addAction}>
            <input type="hidden" name="account_id" value={product.account_id} />
            <input type="hidden" name="product_id" value={product.product_id} />
            <Flex gap="2" align="end">
              <select
                name="connection_id"
                required
                style={{
                  fontFamily: "var(--code-font-family)",
                  padding: "8px 12px",
                  border: "1px solid var(--gray-6)",
                  fontSize: "16px",
                  lineHeight: "1.5",
                  flex: 1,
                }}
              >
                <option value="" disabled>Select a data connection...</option>
                {unusedConnections.map((conn) => (
                  <option key={conn.data_connection_id} value={conn.data_connection_id}>
                    {conn.name} ({conn.details.provider} - {conn.details.region})
                  </option>
                ))}
              </select>
              <Button type="submit" size="2" disabled={addPending} loading={addPending}>
                Add
              </Button>
            </Flex>
          </Form>
          {addState.message && (
            <Text size="2" color={addState.success ? "green" : "red"}>{addState.message}</Text>
          )}
        </Flex>
      )}
    </Flex>
  );
}
