"use client";

import { useActionState } from "react";
import { Text, Table, Flex, Badge, Button, Heading, Code } from "@radix-ui/themes";
import { Link1Icon } from "@radix-ui/react-icons";
import Form from "next/form";
import { formFieldStyle } from "@/components/core/DynamicForm";
import { Product } from "@/types";
import {
  addProductMirror,
  removeProductMirror,
  setPrimaryMirror,
} from "@/lib/actions/product-mirrors";
import type { DataConnectionOption } from "./redact";

interface ProductMirrorsManagerProps {
  product: Product;
  availableConnections: DataConnectionOption[];
  isAdmin: boolean;
}

const emptyFormState = {
  message: "",
  data: new FormData(),
  fieldErrors: {},
  success: false,
};

export function ProductMirrorsManager({
  product,
  availableConnections,
  isAdmin,
}: ProductMirrorsManagerProps) {
  const [addState, addAction, addPending] = useActionState(
    addProductMirror,
    emptyFormState
  );
  const [removeState, removeAction, removePending] = useActionState(
    removeProductMirror,
    emptyFormState
  );
  const [primaryState, primaryAction, primaryPending] = useActionState(
    setPrimaryMirror,
    emptyFormState
  );

  const mirrors = Object.entries(product.metadata.mirrors);

  const usedConnectionIds = new Set(
    mirrors.map(([, mirror]) => mirror.connection_id)
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
              <Table.ColumnHeaderCell>Type</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Prefix</Table.ColumnHeaderCell>
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
                  <Code size="2">{mirror.connection_id}</Code>
                </Table.Cell>
                <Table.Cell>
                  <Badge
                    color={mirror.storage_type === "s3" ? "orange" : "blue"}
                  >
                    {mirror.storage_type}
                  </Badge>
                </Table.Cell>
                <Table.Cell>
                  <Code size="2">{mirror.prefix}</Code>
                </Table.Cell>
                <Table.Cell>
                  {mirror.is_primary ? (
                    <Badge color="green">Primary</Badge>
                  ) : isAdmin ? (
                    <Form action={primaryAction} style={{ display: "inline" }}>
                      <input
                        type="hidden"
                        name="account_id"
                        value={product.account_id}
                      />
                      <input
                        type="hidden"
                        name="product_id"
                        value={product.product_id}
                      />
                      <input type="hidden" name="mirror_key" value={key} />
                      <Button
                        type="submit"
                        size="1"
                        variant="soft"
                        disabled={primaryPending}
                        loading={primaryPending}
                      >
                        Set Primary
                      </Button>
                    </Form>
                  ) : (
                    <Text size="2" color="gray">
                      -
                    </Text>
                  )}
                </Table.Cell>
                {isAdmin && (
                  <Table.Cell>
                    <Form action={removeAction} style={{ display: "inline" }}>
                      <input
                        type="hidden"
                        name="account_id"
                        value={product.account_id}
                      />
                      <input
                        type="hidden"
                        name="product_id"
                        value={product.product_id}
                      />
                      <input type="hidden" name="mirror_key" value={key} />
                      <Button
                        type="submit"
                        size="1"
                        variant="soft"
                        color="red"
                        disabled={removePending}
                        loading={removePending}
                      >
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
        <Text size="2" color={removeState.success ? "green" : "red"}>
          {removeState.message}
        </Text>
      )}
      {primaryState.message && (
        <Text size="2" color={primaryState.success ? "green" : "red"}>
          {primaryState.message}
        </Text>
      )}

      {isAdmin && unusedConnections.length > 0 && (
        <Flex direction="column" gap="2">
          <Text size="3" weight="medium">
            Add Data Connection
          </Text>
          <Form action={addAction}>
            <input
              type="hidden"
              name="account_id"
              value={product.account_id}
            />
            <input
              type="hidden"
              name="product_id"
              value={product.product_id}
            />
            <Flex gap="2" align="end">
              <select
                name="connection_id"
                required
                defaultValue=""
                style={{ ...formFieldStyle, flex: 1 }}
              >
                <option value="" disabled>
                  Select a data connection...
                </option>
                {unusedConnections.map((conn) => (
                  <option
                    key={conn.data_connection_id}
                    value={conn.data_connection_id}
                  >
                    {conn.name} ({conn.provider} - {conn.region})
                  </option>
                ))}
              </select>
              <Button
                type="submit"
                size="2"
                disabled={addPending}
                loading={addPending}
              >
                Add
              </Button>
            </Flex>
          </Form>
          {addState.message && (
            <Text size="2" color={addState.success ? "green" : "red"}>
              {addState.message}
            </Text>
          )}
        </Flex>
      )}
    </Flex>
  );
}
