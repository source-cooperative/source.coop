"use client";

import { useActionState, useState, startTransition } from "react";
import {
  Text,
  Flex,
  Box,
  Button,
  IconButton,
  Code,
  Callout,
  Select,
  TextField,
  DropdownMenu,
  AlertDialog,
} from "@radix-ui/themes";
import {
  InfoCircledIcon,
  DotsHorizontalIcon,
} from "@radix-ui/react-icons";
import Form from "next/form";
import Link from "next/link";
import { Product } from "@/types";
import { Field, FormTitle, SectionHeader } from "@/components/core";
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
import {
  ConnectionList,
  ConnectionRow,
  ConnectionMarker,
  ConnectionsEmpty,
} from "./ConnectionRow";

interface ProductMirrorsManagerProps {
  product: Product;
  availableConnections: DataConnectionOption[];
  // Whether the viewer administers the owning account (org owner/maintainer, the
  // account itself, or an admin). Product-scoped maintainers reach this page but
  // may not change which storage the account's product mirrors to.
  canManageMirrors: boolean;
  // Admins additionally get the /admin edit link for system-level connections.
  isAdmin: boolean;
  // Connection ids owned by the product owner; their admin form is reachable
  // even by non-admins, so we render the link for them.
  ownedConnectionIds: string[];
  /** Display name, provider, and bare bucket/container per connection id, per card. */
  connectionInfo: Record<
    string,
    { name: string; bucket: string; provider: string }
  >;
  // Connection ids whose mirror prefix this user may edit (needs both account
  // and connection management). Others render the prefix read-only.
  editablePrefixConnectionIds: string[];
}

const emptyFormState = {
  message: "",
  data: new FormData(),
  fieldErrors: {},
  success: false,
};

/** Which per-mirror action a result came from. */
export type MirrorAction = "remove" | "primary" | "prefix";

interface ActionResult {
  message: string;
  success: boolean;
}

/**
 * The result belonging to one row, or null.
 *
 * Each action has its own useActionState, and those never reset — a state keeps
 * its last message until that same action runs again. So "whichever state still
 * has a message" is not the same question as "what just happened here": remove a
 * mirror, then save a prefix on another row, and the stale remove message would
 * win on the row that saved. Both the row and the action have to match.
 */
export function resultForRow(
  acted: { key: string; action: MirrorAction } | null,
  key: string,
  states: Record<MirrorAction, ActionResult>
): ActionResult | null {
  if (acted?.key !== key) return null;
  const state = states[acted.action];
  return state.message ? state : null;
}

export function ProductMirrorsManager({
  product,
  availableConnections,
  canManageMirrors,
  isAdmin,
  ownedConnectionIds,
  connectionInfo,
  editablePrefixConnectionIds,
}: ProductMirrorsManagerProps) {
  const ownedConnections = new Set(ownedConnectionIds);
  const editablePrefixConnections = new Set(editablePrefixConnectionIds);
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

  // Which mirror the last action targeted and which action it was, so its result
  // renders on that row instead of joining a pile of messages at the foot of the
  // page. The action matters as much as the row — see resultForRow.
  const [actedOn, setActedOn] = useState<{
    key: string;
    action: MirrorAction;
  } | null>(null);
  // The mirror queued for removal, i.e. the open confirmation.
  const [pendingRemoval, setPendingRemoval] = useState<string | null>(null);

  // Dispatching directly rather than through a <Form> per action: all three
  // carry the same three values, so as markup they were nine hidden inputs per
  // card, and a menu item cannot submit a form it does not contain.
  const dispatchForMirror = (
    action: (formData: FormData) => void,
    mirrorKey: string,
    kind: MirrorAction
  ) => {
    const formData = new FormData();
    formData.set("account_id", product.account_id);
    formData.set("product_id", product.product_id);
    formData.set("mirror_key", mirrorKey);
    setActedOn({ key: mirrorKey, action: kind });
    startTransition(() => action(formData));
  };

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

  const removalTarget = pendingRemoval
    ? product.metadata.mirrors[pendingRemoval]
    : undefined;
  const removalName = removalTarget
    ? (connectionInfo[removalTarget.connection_id]?.name ??
      removalTarget.connection_id)
    : "";

  /** The result of the last action, shown against the row that caused it. */
  const rowMessage = (key: string) => {
    const state = resultForRow(actedOn, key, {
      remove: removeState,
      primary: primaryState,
      prefix: prefixState,
    });
    if (!state) return null;
    return (
      <Text size="1" color={state.success ? "green" : "red"}>
        {state.message}
      </Text>
    );
  };

  return (
    <Box>
      <FormTitle
        title="Data Connections"
        description="Where this product's objects live. The primary connection is the one visitors download from."
      />

      {!canManageMirrors && (
        <Callout.Root size="1" color="gray" mb="4">
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text>
            Only owners and maintainers of <Code>{product.account_id}</Code> can
            change this product&apos;s data connections.
          </Callout.Text>
        </Callout.Root>
      )}

      {/* Standing, not fired after a save: it is worth knowing before acting. */}
      {canManageMirrors && mirrors.length > 0 && (
        <Callout.Root size="1" color="gray" mb="4">
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text>
            The data proxy caches these settings. Changes here can take up to
            five minutes to take effect.
          </Callout.Text>
        </Callout.Root>
      )}

      {mirrors.length === 0 ? (
        <ConnectionsEmpty>
          {canManageMirrors
            ? "Add a data connection to this product."
            : "No data connections have been configured for this product."}
        </ConnectionsEmpty>
      ) : (
        <ConnectionList>
          {mirrors.map(([key, mirror]) => {
            const info = connectionInfo[mirror.connection_id];
            const canEditPrefix = editablePrefixConnections.has(
              mirror.connection_id
            );
            const canOpenConnection =
              isAdmin || ownedConnections.has(mirror.connection_id);

            return (
              // Actions: one affordance rather than three same-weight buttons,
              // so the destructive one stops competing with the routine ones.
              // Footer: the prefix, editable only for users who manage both the
              // owning account and the connection; the server action re-checks.
              <ConnectionRow
                key={key}
                title={
                  <Text size="2" weight="medium">
                    {/* Fall back to the id when the connection no longer
                        loads (e.g. deleted). */}
                    {info?.name ?? mirror.connection_id}
                  </Text>
                }
                markers={
                  mirror.is_primary && (
                    <ConnectionMarker>Primary</ConnectionMarker>
                  )
                }
                meta={info && `${info.provider} · ${info.bucket}`}
                actions={
                  (canManageMirrors || canOpenConnection) && (
                    <DropdownMenu.Root>
                      <DropdownMenu.Trigger>
                        <IconButton
                          size="1"
                          variant="soft"
                          color="gray"
                          aria-label={`Actions for ${info?.name ?? mirror.connection_id}`}
                          disabled={removePending || primaryPending}
                        >
                          <DotsHorizontalIcon />
                        </IconButton>
                      </DropdownMenu.Trigger>
                      <DropdownMenu.Content>
                        {canManageMirrors && !mirror.is_primary && (
                          <DropdownMenu.Item
                            onSelect={() =>
                              dispatchForMirror(primaryAction, key, "primary")
                            }
                          >
                            Make primary
                          </DropdownMenu.Item>
                        )}
                        {canOpenConnection && (
                          <DropdownMenu.Item asChild>
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
                              Edit connection
                            </Link>
                          </DropdownMenu.Item>
                        )}
                        {canManageMirrors && (
                          <>
                            <DropdownMenu.Separator />
                            <DropdownMenu.Item
                              color="red"
                              onSelect={() => setPendingRemoval(key)}
                            >
                              Remove from product…
                            </DropdownMenu.Item>
                          </>
                        )}
                      </DropdownMenu.Content>
                    </DropdownMenu.Root>
                  )
                }
                footer={
                  <>
                    {canEditPrefix ? (
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
                      <Field
                        label="Prefix"
                        help="Where this product's objects sit inside the connection. You can change it because you manage both this product's account and its connection."
                      >
                        {(controlProps) => (
                          <Flex gap="2" align="center">
                            <TextField.Root
                              {...controlProps}
                              name="prefix"
                              size="1"
                              defaultValue={mirror.prefix}
                              placeholder="(connection root)"
                              style={{
                                flex: 1,
                                fontFamily: "var(--code-font-family)",
                              }}
                            />
                            <Button
                              type="submit"
                              size="1"
                              variant="soft"
                              onClick={() => setActedOn({ key, action: "prefix" })}
                              disabled={prefixPending}
                              loading={prefixPending}
                            >
                              Save
                            </Button>
                          </Flex>
                        )}
                      </Field>
                    </Form>
                  ) : (
                    <Field label="Prefix" group>
                      <Code size="2" variant="ghost" color="gray">
                        {mirror.prefix || "(connection root)"}
                      </Code>
                    </Field>
                  )}

                    {rowMessage(key) && <Box mt="2">{rowMessage(key)}</Box>}
                  </>
                }
              />
            );
          })}
        </ConnectionList>
      )}

      {canManageMirrors && (
        <Box mt="6">
          <SectionHeader title="Add a connection">
            {unusedConnections.length === 0 ? (
              <Text size="2" color="gray">
                {availableConnections.length === 0
                  ? "No other connections are available to this account."
                  : "Every connection available to this account is already attached."}
              </Text>
            ) : (
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
                <Flex gap="2" align="center">
                  <Select.Root name="connection_id" size="2" required>
                    <Select.Trigger
                      placeholder="Choose a connection…"
                      style={{ flex: 1 }}
                    />
                    <Select.Content>
                      {unusedConnections.map((conn) => (
                        <Select.Item
                          key={conn.data_connection_id}
                          value={conn.data_connection_id}
                        >
                          {conn.name} ({conn.provider}
                          {conn.region ? ` - ${conn.region}` : ""})
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
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
            )}
            {addState.message && (
              <Text
                as="p"
                size="2"
                mt="2"
                color={addState.success ? "green" : "red"}
              >
                {addState.message}
              </Text>
            )}
          </SectionHeader>
        </Box>
      )}

      {/* Removing a mirror re-points where this product is served from, so it
          asks first — as deleting a connection already does. */}
      <AlertDialog.Root
        open={pendingRemoval !== null}
        onOpenChange={(open) => !open && setPendingRemoval(null)}
      >
        <AlertDialog.Content maxWidth="450px">
          <AlertDialog.Title>Remove {removalName}?</AlertDialog.Title>
          <AlertDialog.Description size="2">
            This product will no longer be served from that storage. The objects
            themselves are not deleted, and you can attach the connection again
            later.
          </AlertDialog.Description>
          <Flex gap="3" mt="4" justify="end">
            <AlertDialog.Cancel>
              <Button variant="soft" color="gray">
                Cancel
              </Button>
            </AlertDialog.Cancel>
            <Button
              color="red"
              disabled={removePending}
              loading={removePending}
              onClick={() => {
                if (pendingRemoval) {
                  dispatchForMirror(removeAction, pendingRemoval, "remove");
                }
                setPendingRemoval(null);
              }}
            >
              Remove
            </Button>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>
    </Box>
  );
}
