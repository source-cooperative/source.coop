"use client";

import React, { useActionState, useState } from "react";
import {
  Button,
  Card,
  Checkbox,
  Code,
  Flex,
  Select,
  Text,
  TextField,
} from "@radix-ui/themes";
import { PlusIcon, TrashIcon } from "@radix-ui/react-icons";
import { Field, FormActions, SectionHeader } from "@/components/core";
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

/**
 * Creates a service account: who it is, how software signs in as it, and
 * what it may reach. Sign-in and reach are both optional at creation — each
 * can be added from the list later — but a workflow named here gets its
 * workflow step the moment the account exists.
 */
export function ServiceAccountForm({ ownerAccountId, products }: ServiceAccountFormProps) {
  const [state, formAction, pending] = useActionState(
    createServiceAccount,
    IDLE_SERVICE_ACCOUNT_FORM_STATE
  );
  const [name, setName] = useState("");
  const [accountId, setAccountId] = useState("");
  const [idEdited, setIdEdited] = useState(false);
  const [workflows, setWorkflows] = useState<GithubWorkflow[]>([]);
  const [grants, setGrants] = useState<Record<string, MembershipRole>>({});

  if (state.success && state.created) {
    return <ServiceAccountCreated created={state.created} ownerAccountId={ownerAccountId} />;
  }


  return (
    <form action={formAction}>
      <input type="hidden" name="owner_account_id" value={ownerAccountId} />
      <Flex direction="column" gap="6">
        <Flex direction="column" gap="4">
          <SectionHeader
            title="Who it is"
            description={`Owned by ${ownerAccountId}. Whoever manages that account manages this one.`}
          />
          <Field label="Name" htmlFor="sa-name" required errors={state.fieldErrors.name}>
            <TextField.Root
              id="sa-name"
              name="name"
              size="3"
              placeholder="Nightly Sync"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!idEdited) setAccountId(slugifyToId(e.target.value));
              }}
            />
          </Field>
          <Field
            label="Account ID"
            htmlFor="sa-id"
            required
            help="The handle software signs in as. Lowercase letters, numbers and single hyphens."
            errors={state.fieldErrors.account_id}
          >
            <TextField.Root
              id="sa-id"
              name="account_id"
              size="3"
              value={accountId}
              onChange={(e) => {
                setIdEdited(true);
                setAccountId(e.target.value);
              }}
            />
          </Field>
        </Flex>

        <Flex direction="column" gap="4">
          <SectionHeader
            title="How software signs in"
            description="A GitHub Actions workflow, pinned to one repository and one ref or environment. GitHub vouches for it, so there is no secret to store. Every workflow reaches the same account with the same access."
          />
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
                  <Button
                    type="button"
                    variant="ghost"
                    color="red"
                    onClick={() => setWorkflows((all) => all.filter((_, i) => i !== index))}
                  >
                    <TrashIcon /> Remove
                  </Button>
                }
              />
            </Card>
          ))}
          <Flex align="center" gap="4">
            <Button
              type="button"
              variant="soft"
              onClick={() => setWorkflows((all) => [...all, NEW_GITHUB_WORKFLOW])}
            >
              <PlusIcon /> Add a GitHub workflow
            </Button>
            <Text size="1" color="gray">
              API keys, for environments without OIDC, are coming.
            </Text>
          </Flex>
        </Flex>

        <Flex direction="column" gap="4">
          <SectionHeader
            title="What it can reach"
            description={`Products ${ownerAccountId} owns. Each becomes an ordinary membership — the same row, and the same revocation, as a person's.`}
          />
          {products.length === 0 ? (
            <Text size="2" color="gray">
              {ownerAccountId} has no products yet.
            </Text>
          ) : (
            <Flex direction="column" gap="2">
              {products.map((product) => {
                const role = grants[product.product_id];
                return (
                  <Flex key={product.product_id} align="center" gap="3" wrap="wrap">
                    <Text as="label" size="2">
                      <Flex align="center" gap="2">
                        <Checkbox
                          checked={role !== undefined}
                          onCheckedChange={(checked) =>
                            setGrants((all) => {
                              const next = { ...all };
                              if (checked === true) next[product.product_id] = MembershipRole.ReadData;
                              else delete next[product.product_id];
                              return next;
                            })
                          }
                        />
                        <Code>{product.product_id}</Code>
                        <Text color="gray">{product.title}</Text>
                      </Flex>
                    </Text>
                    {role !== undefined && (
                      <>
                        <input type="hidden" name={`grant:${product.product_id}`} value={role} />
                        <Select.Root
                          value={role}
                          onValueChange={(next) =>
                            setGrants((all) => ({ ...all, [product.product_id]: next as MembershipRole }))
                          }
                        >
                          <Select.Trigger aria-label={`Access to ${product.product_id}`} />
                          <Select.Content>
                            <Select.Item value={MembershipRole.ReadData}>Read</Select.Item>
                            <Select.Item value={MembershipRole.WriteData}>Read and write</Select.Item>
                          </Select.Content>
                        </Select.Root>
                      </>
                    )}
                  </Flex>
                );
              })}
            </Flex>
          )}
        </Flex>

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
