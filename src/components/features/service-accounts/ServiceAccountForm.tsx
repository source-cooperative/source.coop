"use client";

import React, { useActionState, useState } from "react";
import {
  Button,
  Card,
  Code,
  Flex,
  IconButton,
  SegmentedControl,
  Text,
  TextField,
} from "@radix-ui/themes";
import { PlusIcon, TrashIcon } from "@radix-ui/react-icons";
import { Field, FormActions, SectionHeader } from "@/components/core";
import {
  ConnectionList,
  ConnectionRow,
} from "@/components/features/data-connections/ConnectionRow";
import { createServiceAccount } from "@/lib/actions/service-accounts";
import {
  IDLE_SERVICE_ACCOUNT_FORM_STATE,
  MembershipRole,
  slugifyToId,
  type Product,
} from "@/types";
import { ServiceAccountCreated } from "./ServiceAccountCreated";
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

const NO_ACCESS = "none";

/**
 * Creates a service account: who it is, how software signs in as it, and
 * what it may reach. Sign-in and reach are both optional at creation — each
 * can be added from the account's page later — but a workflow named here gets
 * its workflow step the moment the account exists.
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
  const [grants, setGrants] = useState<Record<string, MembershipRole>>({});

  if (state.success && state.created) {
    return <ServiceAccountCreated created={state.created} ownerAccountId={ownerAccountId} />;
  }

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
          description={`Products ${ownerAccountId} owns. Each grant is an ordinary membership, revoked the same way as a person's.`}
        >
          {products.length === 0 ? (
            <Text size="2" color="gray">
              {ownerAccountId} has no products yet.
            </Text>
          ) : (
            <ConnectionList>
              {products.map(({ product_id, title }) => {
                const role = grants[product_id];
                return (
                  <ConnectionRow
                    key={product_id}
                    title={<Text size="2" weight="medium">{title}</Text>}
                    meta={product_id}
                    actions={
                      <>
                        {role && <input type="hidden" name={`grant:${product_id}`} value={role} />}
                        <SegmentedControl.Root
                          size="1"
                          aria-label={`Access to ${product_id}`}
                          value={role ?? NO_ACCESS}
                          onValueChange={(next) =>
                            setGrants((all) => {
                              const { [product_id]: _, ...rest } = all;
                              return next === NO_ACCESS
                                ? rest
                                : { ...rest, [product_id]: next as MembershipRole };
                            })
                          }
                        >
                          <SegmentedControl.Item value={NO_ACCESS}>None</SegmentedControl.Item>
                          <SegmentedControl.Item value={MembershipRole.ReadData}>Read</SegmentedControl.Item>
                          <SegmentedControl.Item value={MembershipRole.WriteData}>
                            Read and write
                          </SegmentedControl.Item>
                        </SegmentedControl.Root>
                      </>
                    }
                  />
                );
              })}
            </ConnectionList>
          )}
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
