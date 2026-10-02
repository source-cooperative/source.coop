"use client";

import React, { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Code,
  DropdownMenu,
  Flex,
  IconButton,
  Text,
  TextField,
} from "@radix-ui/themes";
import { DotsHorizontalIcon } from "@radix-ui/react-icons";
import { Field, FormActions, SectionHeader } from "@/components/core";
import { ItemList } from "@/components/core/ItemList";
import { createServiceAccount } from "@/lib/actions/service-accounts";
import {
  IDLE_SERVICE_ACCOUNT_FORM_STATE,
  slugifyToId,
  type Product,
} from "@/types";
import { ProductAccessList, type ProductAccess } from "./ProductAccessList";
import { GrantProductDialog } from "./GrantProductDialog";
import { AddSignInMenu, SIGN_IN_DESCRIPTION } from "./AddSignInMenu";
import type { ApiKeyDraft } from "./IssueApiKeyDialog";
import { handOffIssuedKey } from "./IssuedApiKeyDialog";

/** A sign-in's menu, as on the account's page; nothing is saved yet, so only "Remove". */
function RemoveMenu({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        <IconButton type="button" size="1" variant="ghost" color="gray" aria-label={`Actions for ${label}`}>
          <DotsHorizontalIcon />
        </IconButton>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align="end" size="1">
        <DropdownMenu.Item color="red" onSelect={onRemove}>
          Remove
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}

interface ServiceAccountFormProps {
  ownerAccountId: string;
  products: Pick<Product, "product_id" | "title">[];
}

/**
 * Creates a service account: who it is, how software signs in as it — by
 * GitHub workflow or API key — and what it may reach. Sign-in and reach are
 * both optional at creation, and both can be changed on the account's page,
 * where submitting lands. A key issued here is shown there, over the page,
 * the one time it can be.
 */
export function ServiceAccountForm({ ownerAccountId, products }: ServiceAccountFormProps) {
  const [state, formAction, pending] = useActionState(
    createServiceAccount,
    IDLE_SERVICE_ACCOUNT_FORM_STATE
  );
  const [name, setName] = useState("");
  const [localId, setLocalId] = useState("");
  const [editingId, setEditingId] = useState(false);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [grants, setGrants] = useState<Record<string, ProductAccess>>({});
  const setGrant = (product_id: string, access: ProductAccess | null) =>
    setGrants((all) => {
      const { [product_id]: _dropped, ...rest } = all;
      return access ? { ...rest, [product_id]: access } : rest;
    });
  const [apiKey, setApiKey] = useState<ApiKeyDraft | null>(null);

  // A rejected id opens the field, so the error sits beside something to fix.
  const showIdField = editingId || !!state.fieldErrors.local_id;
  const prefix = `${ownerAccountId}--`;

  // With a key there was no redirect, since it would lose the key: hand it
  // to the account's page, which shows it over itself, and go there.
  const router = useRouter();
  useEffect(() => {
    if (!state.issued) return;
    handOffIssuedKey(state.issued);
    router.push(state.issued.account_url);
  }, [state.issued, router]);

  return (
    <form action={formAction}>
      <input type="hidden" name="owner_account_id" value={ownerAccountId} />
      <Flex direction="column" gap="6">
        <SectionHeader
          title="Who it is"
          description={`Owned by ${ownerAccountId}; whoever manages that account manages this one.`}
        >
          <Flex direction="column" gap="4">
            <Field label="Name" htmlFor="sa-name" required errors={state.fieldErrors.name}>
              <TextField.Root
                id="sa-name"
                name="name"
                size="3"
                placeholder="Nightly Sync"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!showIdField) setLocalId(slugifyToId(e.target.value));
                }}
              />
            </Field>
            {/* The owner's id, then the account's own, made from the name the
                way a data connection's id is: unique per owner, so every
                owner can have its own "nightly-sync". Shown rather than asked
                for; the part after the owner is editable. */}
            {showIdField ? (
              <Field
                label="Account ID"
                htmlFor="sa-id"
                required
                help="The handle software signs in as. Lowercase letters, numbers and single hyphens."
                errors={state.fieldErrors.local_id}
              >
                <TextField.Root
                  id="sa-id"
                  name="local_id"
                  size="3"
                  value={localId}
                  onChange={(e) => setLocalId(e.target.value)}
                  // One face, and no gap after the owner: it reads as one id.
                  style={{ fontFamily: "var(--code-font-family)" }}
                >
                  <TextField.Slot pr="0">{prefix}</TextField.Slot>
                </TextField.Root>
              </Field>
            ) : (
              <Field label="Account ID" help="Made from the name. Permanent once created." group>
                <Flex align="center" gap="3">
                  <input type="hidden" name="local_id" value={localId} />
                  <Code size="2" variant="ghost" color="gray">
                    {localId ? prefix + localId : "—"}
                  </Code>
                  <Button type="button" size="1" variant="ghost" onClick={() => setEditingId(true)}>
                    Edit
                  </Button>
                </Flex>
              </Field>
            )}
          </Flex>
        </SectionHeader>

        <SectionHeader
          title="Signs in with"
          description={SIGN_IN_DESCRIPTION}
          rightButton={
            <AddSignInMenu
              // One key at creation; the account's page issues more.
              keyDisabled={!!apiKey}
              onAdd={(signIn) =>
                "github" in signIn
                  ? setSubjects((all) => (all.includes(signIn.github) ? all : [...all, signIn.github]))
                  : setApiKey(signIn.key)
              }
            />
          }
        >
          {subjects.map((subject) => (
            <input key={subject} type="hidden" name="github_subject" value={subject} />
          ))}
          {apiKey && (
            <>
              <input type="hidden" name="key_label" value={apiKey.label} />
              <input type="hidden" name="expires_in_days" value={apiKey.expires_in_days} />
            </>
          )}
          {subjects.length === 0 && !apiKey ? (
            <Text size="2" color="gray">
              Nothing yet — add a workflow or a key now, or later from its page.
            </Text>
          ) : (
            <Flex direction="column" gap="4">
              {subjects.length > 0 && (
                <Flex direction="column" gap="2">
                  <Text size="1" weight="medium" color="gray">
                    GitHub workflows
                  </Text>
                  <ItemList.Root>
                    {subjects.map((subject) => (
                      <ItemList.Row
                        key={subject}
                        title={
                          <Text size="2" style={{ fontFamily: "var(--code-font-family)", wordBreak: "break-all" }}>
                            {subject}
                          </Text>
                        }
                        meta="GitHub Actions"
                        actions={
                          <RemoveMenu
                            label={subject}
                            onRemove={() => setSubjects((all) => all.filter((s) => s !== subject))}
                          />
                        }
                      />
                    ))}
                  </ItemList.Root>
                </Flex>
              )}
              {apiKey && (
                <Flex direction="column" gap="2">
                  <Text size="1" weight="medium" color="gray">
                    API keys
                  </Text>
                  <ItemList.Root>
                    <ItemList.Row
                      title={<Text size="2" weight="medium">{apiKey.label}</Text>}
                      meta={
                        apiKey.expires_in_days
                          ? `Expires ${apiKey.expires_in_days} days after it is issued`
                          : "Never expires"
                      }
                      actions={<RemoveMenu label={apiKey.label} onRemove={() => setApiKey(null)} />}
                    />
                  </ItemList.Root>
                </Flex>
              )}
            </Flex>
          )}
          {state.fieldErrors.key_label && (
            <Text as="p" size="1" color="red" mt="2">
              {state.fieldErrors.key_label.join(" ")}
            </Text>
          )}
        </SectionHeader>

        <SectionHeader
          title="Can reach"
          description={`Products ${ownerAccountId} owns that it may read or write. Each grant is an ordinary membership, revoked the same way as a person's.`}
          rightButton={
            <GrantProductDialog
              ownerAccountId={ownerAccountId}
              available={products.filter((p) => !grants[p.product_id])}
              onGrant={setGrant}
            />
          }
        >
          {Object.entries(grants).map(([product_id, role]) => (
            <input key={product_id} type="hidden" name={`grant:${product_id}`} value={role} />
          ))}
          <ProductAccessList
            ownerAccountId={ownerAccountId}
            products={products}
            access={grants}
            onChange={setGrant}
          />
        </SectionHeader>

        <FormActions
          submitLabel="Create service account"
          pending={pending}
          message={state.message}
          success={state.success}
        />
      </Flex>
    </form>
  );
}
