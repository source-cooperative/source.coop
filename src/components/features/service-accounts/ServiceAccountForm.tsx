"use client";

import React, { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Button,
  Card,
  Code,
  Flex,
  IconButton,
  TextField,
} from "@radix-ui/themes";
import { PlusIcon, TrashIcon } from "@radix-ui/react-icons";
import { Field, FormActions, SectionHeader } from "@/components/core";
import { createServiceAccount } from "@/lib/actions/service-accounts";
import {
  IDLE_SERVICE_ACCOUNT_FORM_STATE,
  slugifyToId,
  type Product,
} from "@/types";
import { ProductAccessList, type ProductAccess } from "./ProductAccessList";
import { GrantProductDialog } from "./GrantProductDialog";
import {
  GithubWorkflowFields,
  NEW_GITHUB_WORKFLOW,
  githubSubject,
  type GithubWorkflow,
} from "./GithubWorkflowFields";
import { ApiKeyExpiryField } from "./ApiKeyExpiryField";
import { handOffIssuedKey } from "./IssuedApiKeyDialog";

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
  const [workflows, setWorkflows] = useState<GithubWorkflow[]>([]);
  const [grants, setGrants] = useState<Record<string, ProductAccess>>({});
  const setGrant = (product_id: string, access: ProductAccess | null) =>
    setGrants((all) => {
      const { [product_id]: _dropped, ...rest } = all;
      return access ? { ...rest, [product_id]: access } : rest;
    });
  const [withKey, setWithKey] = useState(false);

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
          title="How software signs in"
          description="GitHub Actions workflows, each pinned to one repository and one ref or environment; GitHub vouches for every run, so there is no secret to store. Or an API key, for environments without OIDC."
        >
          <Flex direction="column" gap="3">
            {workflows.map((workflow, index) => (
              <Card key={index}>
                <input type="hidden" name="github_subject" value={githubSubject(workflow)} />
                <GithubWorkflowFields
                  id={`wf-${index}`}
                  workflow={workflow}
                  onChange={(next) =>
                    setWorkflows((all) => all.map((w, i) => (i === index ? next : w)))
                  }
                  trailing={
                    <IconButton
                      type="button"
                      size="2"
                      variant="soft"
                      color="red"
                      aria-label={`Remove workflow ${index + 1}`}
                      onClick={() => setWorkflows((all) => all.filter((_, i) => i !== index))}
                    >
                      <TrashIcon />
                    </IconButton>
                  }
                />
              </Card>
            ))}
            {withKey && (
              <Card>
                <Flex direction="column" gap="3">
                  <Flex gap="3" align="end">
                    <Box flexGrow="1">
                      <Field
                        label="API key label"
                        htmlFor="key-label"
                        required
                        help="Where this key will live, so you know which one to revoke."
                        errors={state.fieldErrors.key_label}
                      >
                        <TextField.Root id="key-label" name="key_label" size="2" placeholder="HPC cron job" maxLength={64} />
                      </Field>
                    </Box>
                    <IconButton
                      type="button"
                      size="2"
                      variant="soft"
                      color="red"
                      aria-label="Remove the API key"
                      onClick={() => setWithKey(false)}
                    >
                      <TrashIcon />
                    </IconButton>
                  </Flex>
                  <ApiKeyExpiryField id="key-expiry" />
                </Flex>
              </Card>
            )}
            <Flex gap="3" wrap="wrap">
              <Button
                type="button"
                variant="soft"
                onClick={() => setWorkflows((all) => [...all, NEW_GITHUB_WORKFLOW])}
              >
                <PlusIcon /> Add a GitHub workflow
              </Button>
              {/* One at creation; the account's page issues more. */}
              {!withKey && (
                <Button type="button" variant="soft" onClick={() => setWithKey(true)}>
                  <PlusIcon /> Add an API key
                </Button>
              )}
            </Flex>
          </Flex>
        </SectionHeader>

        <SectionHeader
          title="What it can reach"
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
