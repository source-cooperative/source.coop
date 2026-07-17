"use client";

import { useActionState } from "react";
import { Text, Card, Flex, Badge, Button, Heading, Code } from "@radix-ui/themes";
import { Link1Icon } from "@radix-ui/react-icons";
import Form from "next/form";
import Link from "next/link";
import { formFieldStyle } from "@/components/core/DynamicForm";
import { Product } from "@/types";
import {
  addProductMirror,
  removeProductMirror,
  setPrimaryMirror,
  updateMirrorPrefix,
} from "@/lib/actions/product-mirrors";
import {
  adminDataConnectionEditUrl,
  accountDataConnectionEditUrl,
} from "@/lib/urls";
import type { DataConnectionOption } from "./redact";

interface ProductMirrorsManagerProps {
  product: Product;
  availableConnections: DataConnectionOption[];
  isAdmin: boolean;
  // Connection ids owned by the product owner; their admin form is reachable
  // even by non-admins, so we render the link for them.
  ownedConnectionIds: string[];
  /** Bare bucket/container name per connection id, shown on each card. */
  connectionBuckets: Record<string, string>;
}

/** A labeled value on a mirror card. */
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Flex direction="column" gap="1">
      <Text size="1" color="gray">
        {label}
      </Text>
      {children}
    </Flex>
  );
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
  ownedConnectionIds,
  connectionBuckets,
}: ProductMirrorsManagerProps) {
  const ownedConnections = new Set(ownedConnectionIds);
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
  const [prefixState, prefixAction, prefixPending] = useActionState(
    updateMirrorPrefix,
    emptyFormState
  );

  // Primary mirror first, then stable by key.
  const mirrors = Object.entries(product.metadata.mirrors).sort(
    ([keyA, a], [keyB, b]) =>
      Number(b.is_primary) - Number(a.is_primary) || keyA.localeCompare(keyB)
  );

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
        <Flex direction="column" gap="3">
          {mirrors.map(([key, mirror]) => (
            <Card key={key}>
              <Flex direction="column" gap="3">
                <Flex justify="between" align="start" gap="3" wrap="wrap">
                  <Field label="Connection">
                    <Flex align="center" gap="2">
                      <Code size="2">{mirror.connection_id}</Code>
                      {mirror.is_primary && (
                        <Badge color="green">Primary</Badge>
                      )}
                    </Flex>
                  </Field>
                  <Flex align="center" gap="2">
                    {(isAdmin ||
                      ownedConnections.has(mirror.connection_id)) && (
                      <Button asChild size="1" variant="soft">
                        <Link
                          // Owned connections are managed under the owner
                          // account's settings (reachable by its owners and
                          // maintainers); only unowned (system) connections
                          // live in the admin view, which non-admins can't
                          // open.
                          href={
                            ownedConnections.has(mirror.connection_id)
                              ? accountDataConnectionEditUrl(
                                  product.account_id,
                                  mirror.connection_id
                                )
                              : adminDataConnectionEditUrl(
                                  mirror.connection_id
                                )
                          }
                        >
                          Edit
                        </Link>
                      </Button>
                    )}
                    {isAdmin && !mirror.is_primary && (
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
                    )}
                    {isAdmin && (
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
                    )}
                  </Flex>
                </Flex>
                <Flex gap="5" wrap="wrap">
                  <Field label="Type">
                    <Badge color="gray">{mirror.storage_type}</Badge>
                  </Field>
                  {connectionBuckets[mirror.connection_id] && (
                    <Field label="Bucket">
                      <Code size="2" variant="ghost" color="gray">
                        {connectionBuckets[mirror.connection_id]}
                      </Code>
                    </Field>
                  )}
                </Flex>
                {/* Everyone who can open this page passed PutRepository
                    (layout gate), so the prefix is editable for all viewers;
                    the server action re-checks. */}
                <Form action={prefixAction}>
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
                  <Field label="Prefix">
                    <Flex gap="2" align="center">
                      <input
                        name="prefix"
                        defaultValue={mirror.prefix}
                        required
                        style={{
                          ...formFieldStyle,
                          flex: 1,
                          fontFamily: "var(--code-font-family)",
                          fontSize: "var(--font-size-1)",
                        }}
                      />
                      <Button
                        type="submit"
                        size="1"
                        variant="soft"
                        disabled={prefixPending}
                        loading={prefixPending}
                      >
                        Save
                      </Button>
                    </Flex>
                  </Field>
                </Form>
              </Flex>
            </Card>
          ))}
        </Flex>
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
      {prefixState.message && (
        <Text size="2" color={prefixState.success ? "green" : "red"}>
          {prefixState.message}
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
                    {conn.name} ({conn.provider}
                    {conn.region ? ` - ${conn.region}` : ""})
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
