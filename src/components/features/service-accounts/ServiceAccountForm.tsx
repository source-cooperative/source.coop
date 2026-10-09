"use client";

import React, { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Code,
  Flex,
  IconButton,
  Text,
  TextField,
} from "@radix-ui/themes";
import { TrashIcon } from "@radix-ui/react-icons";
import { useTranslations } from "next-intl";
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
import { AddSignInMenu } from "./AddSignInMenu";
import type { ApiKeyDraft } from "./IssueApiKeyDialog";
import { handOffIssuedKey } from "./IssuedApiKeyDialog";

/** Drops a sign-in the form holds; nothing is saved yet, so there is nothing else to do with it. */
function RemoveButton({ label, onRemove }: { label: string; onRemove: () => void }) {
  const t = useTranslations("ServiceAccountForm");
  return (
    <IconButton type="button" size="1" variant="ghost" color="red" aria-label={t("removeLabel", { label })} onClick={onRemove}>
      <TrashIcon />
    </IconButton>
  );
}

interface ServiceAccountFormProps {
  ownerAccountId: string;
  products: Pick<Product, "product_id" | "title">[];
  /** The data proxy's origin, shown as the audience a trusted workflow's token must carry. */
  proxyOrigin?: string;
}

/**
 * Creates a service account: who it is, how software signs in as it — by
 * GitHub workflow or API key — and what it may reach. Sign-in and reach are
 * both optional at creation, and both can be changed on the account's page,
 * where submitting lands. A key issued here is shown there, over the page,
 * the one time it can be.
 */
export function ServiceAccountForm({
  ownerAccountId,
  products,
  proxyOrigin,
}: ServiceAccountFormProps) {
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
  const t = useTranslations("ServiceAccountForm");
  const tSignIn = useTranslations("AddSignInMenu");
  const tc = useTranslations("Common");

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
          title={t("whoItIs")}
          description={t("ownedBy", { owner: ownerAccountId })}
        >
          <Flex direction="column" gap="4">
            <Field label={t("name")} htmlFor="sa-name" required errors={state.fieldErrors.name}>
              <TextField.Root
                id="sa-name"
                name="name"
                size="3"
                placeholder={t("namePlaceholder")}
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
                label={t("accountId")}
                htmlFor="sa-id"
                required
                help={t("accountIdEditHelp")}
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
              <Field label={t("accountId")} help={t("accountIdHelp")} group>
                <Flex align="center" gap="3">
                  <input type="hidden" name="local_id" value={localId} />
                  <Code size="2" variant="ghost" color="gray">
                    {localId ? prefix + localId : "—"}
                  </Code>
                  <Button type="button" size="1" variant="ghost" onClick={() => setEditingId(true)}>
                    {tc("edit")}
                  </Button>
                </Flex>
              </Field>
            )}
          </Flex>
        </SectionHeader>

        <SectionHeader
          title={t("signsInWith")}
          description={tSignIn("description")}
          rightButton={
            <AddSignInMenu
              proxyOrigin={proxyOrigin}
              // One key at creation; the account's page issues more.
              keyDisabled={!!apiKey}
              onAddGithub={(subject) =>
                setSubjects((all) => (all.includes(subject) ? all : [...all, subject]))
              }
              onAddKey={setApiKey}
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
              {t("nothingYet")}
            </Text>
          ) : (
            <Flex direction="column" gap="4">
              {subjects.length > 0 && (
                <Flex direction="column" gap="2">
                  <Text size="1" weight="medium" color="gray">
                    {t("githubWorkflows")}
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
                          <RemoveButton
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
                    {t("apiKeys")}
                  </Text>
                  <ItemList.Root>
                    <ItemList.Row
                      title={<Text size="2" weight="medium">{apiKey.label}</Text>}
                      meta={
                        apiKey.expires_in_days
                          ? t("expiresAfter", { days: Number(apiKey.expires_in_days) })
                          : t("neverExpires")
                      }
                      actions={<RemoveButton label={apiKey.label} onRemove={() => setApiKey(null)} />}
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
          title={t("canReach")}
          description={t("canReachDescription", { owner: ownerAccountId })}
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
          submitLabel={t("submit")}
          pending={pending}
          message={state.message}
          success={state.success}
        />
      </Flex>
    </form>
  );
}
