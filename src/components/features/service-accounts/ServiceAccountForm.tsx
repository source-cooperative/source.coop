"use client";

import React, { useActionState, useState } from "react";
import {
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
import {
  GithubWorkflowFields,
  NEW_GITHUB_WORKFLOW,
  githubSubject,
  type GithubWorkflow,
} from "./GithubWorkflowFields";

interface ServiceAccountFormProps {
  ownerAccountId: string;
  products: Pick<Product, "product_id" | "title">[];
}

/**
 * Creates a service account: who it is, how software signs in as it, and
 * what it may reach. Sign-in and reach are both optional at creation, and
 * both can be changed on the account's page, where submitting lands.
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

  // A rejected id opens the field, so the error sits beside something to fix.
  const showIdField = editingId || !!state.fieldErrors.local_id;
  const prefix = `${ownerAccountId}--`;

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
          description="GitHub Actions workflows, each pinned to one repository and one ref or environment. GitHub vouches for every run, so there is no secret to store."
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
            <Flex>
              <Button
                type="button"
                variant="soft"
                onClick={() => setWorkflows((all) => [...all, NEW_GITHUB_WORKFLOW])}
              >
                <PlusIcon /> Add a GitHub workflow
              </Button>
            </Flex>
          </Flex>
        </SectionHeader>

        <SectionHeader
          title="What it can reach"
          description={`Products ${ownerAccountId} owns that it may read or write. Each grant is an ordinary membership, revoked the same way as a person's.`}
        >
          {Object.entries(grants).map(([product_id, role]) => (
            <input key={product_id} type="hidden" name={`grant:${product_id}`} value={role} />
          ))}
          <ProductAccessList
            ownerAccountId={ownerAccountId}
            products={products}
            access={grants}
            onChange={(product_id, access) =>
              setGrants((all) => {
                const { [product_id]: _dropped, ...rest } = all;
                return access ? { ...rest, [product_id]: access } : rest;
              })
            }
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
