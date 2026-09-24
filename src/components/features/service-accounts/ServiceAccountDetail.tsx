"use client";

import React, { startTransition, useActionState, useOptimistic, useState } from "react";
import {
  AlertDialog,
  Button,
  Code,
  Dialog,
  Flex,
  Heading,
  IconButton,
  Select,
  Text,
  Tooltip,
} from "@radix-ui/themes";
import { Cross2Icon, PlusIcon } from "@radix-ui/react-icons";
import { SectionHeader } from "@/components/core";
import {
  ConnectionList,
  ConnectionMarker,
  ConnectionRow,
} from "@/components/features/data-connections/ConnectionRow";
import {
  deleteServiceAccount,
  removeTrust,
  setProductAccess,
  setServiceAccountDisabled,
} from "@/lib/actions/service-accounts";
import { githubWorkflowStep } from "@/lib/services/github-workflow";
import {
  GITHUB_ACTIONS_ISSUER,
  IDLE_SERVICE_ACCOUNT_ACTION_STATE as IDLE,
  MembershipRole,
  type Product,
  type ServiceAccountActionState,
  type ServiceAccountSummary,
} from "@/types";
import { AddGithubTrustDialog } from "./AddGithubTrustDialog";
import { NO_ACCESS, ProductAccessList, type ProductAccess } from "./ProductAccessList";
import { WorkflowSnippet } from "./WorkflowSnippet";

const issuerLabel = (issuer: string) =>
  issuer === GITHUB_ACTIONS_ISSUER ? "GitHub Actions" : issuer;

function Status({ state }: { state: ServiceAccountActionState }) {
  return state.message ? (
    <Text as="p" size="1" color={state.success ? "green" : "red"} mt="2">
      {state.message}
    </Text>
  ) : null;
}

/** The step a trusted workflow adds to act as the account, in a modal. */
function ExampleUsage({ subject, step }: { subject: string; step: string }) {
  return (
    <Dialog.Root>
      <Dialog.Trigger>
        <Button size="1" variant="ghost">
          Example usage
        </Button>
      </Dialog.Trigger>
      <Dialog.Content style={{ maxWidth: 640 }} aria-describedby={undefined}>
        <Dialog.Title>Sign in from this workflow</Dialog.Title>
        <WorkflowSnippet subject={subject} step={step} />
        <Flex justify="end" mt="4">
          <Dialog.Close>
            <Button variant="soft" color="gray">
              Close
            </Button>
          </Dialog.Close>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}

/**
 * One service account, and every control over it: the workflows it trusts,
 * each with its example usage; the products it reaches, each changed or
 * removed as it stands and another granted from a new row, saved as it is
 * changed; and — set apart — disabling and deleting it.
 */
export function ServiceAccountDetail({
  summary,
  products,
  proxyOrigin,
}: {
  summary: ServiceAccountSummary;
  /** The owner's products, each of which it may reach. */
  products: Pick<Product, "product_id" | "title">[];
  /** The data proxy a workflow signs in to; without it, no example is shown. */
  proxyOrigin?: string;
}) {
  const { account, trusts, grants } = summary;
  const [accessState, accessAction, savingAccess] = useActionState(setProductAccess, IDLE);
  // Shown as chosen at once; the page's revalidation then confirms it, or the
  // failure below explains why it went back.
  const [access, chooseAccess] = useOptimistic(
    Object.fromEntries(grants.map((g) => [g.repository_id ?? "", g.role as ProductAccess])),
    (current, [product_id, next]: [string, ProductAccess | null]) => {
      const { [product_id]: _dropped, ...rest } = current;
      return next ? { ...rest, [product_id]: next } : rest;
    }
  );
  // A row with a product dropdown, added by "Grant a product"; picking one
  // grants it to read, and the row becomes an ordinary one.
  const [drafting, setDrafting] = useState(false);
  const unreached = products.filter((p) => !access[p.product_id]);
  const setAccess = (product_id: string, next: ProductAccess | null) => {
    const data = new FormData();
    data.set("account_id", account.account_id);
    data.set("product_id", product_id);
    data.set("access", next ?? NO_ACCESS);
    startTransition(() => {
      chooseAccess([product_id, next]);
      accessAction(data);
    });
  };
  const [removeState, removeAction, removing] = useActionState(removeTrust, IDLE);
  const [toggleState, toggleAction, toggling] = useActionState(setServiceAccountDisabled, IDLE);
  const [deleteState, deleteAction, deleting] = useActionState(deleteServiceAccount, IDLE);

  return (
    <Flex direction="column" gap="6">
      <Flex direction="column" gap="1">
        <Flex align="center" gap="2" wrap="wrap">
          <Heading size="5">{account.name}</Heading>
          {account.disabled && <ConnectionMarker>Disabled</ConnectionMarker>}
        </Flex>
        <Code size="2" variant="ghost" color="gray">
          {account.account_id}
        </Code>
      </Flex>

      <SectionHeader
        title="Signs in as"
        description="Workflows trusted to act as this account."
        rightButton={<AddGithubTrustDialog accountId={account.account_id} />}
      >
        {trusts.length === 0 ? (
          <Text size="2" color="gray">
            Nothing yet — it cannot sign in until a workflow is trusted.
          </Text>
        ) : (
          <ConnectionList>
            {trusts.map((trust) => (
              <ConnectionRow
                key={`${trust.issuer} ${trust.subject}`}
                title={
                  <Text size="2" style={{ fontFamily: "var(--code-font-family)", wordBreak: "break-all" }}>
                    {trust.subject}
                  </Text>
                }
                meta={issuerLabel(trust.issuer)}
                actions={
                  <Flex align="center" gap="3">
                    {proxyOrigin && trust.issuer === GITHUB_ACTIONS_ISSUER && (
                      <ExampleUsage
                        subject={trust.subject}
                        step={githubWorkflowStep(proxyOrigin, account.account_id)}
                      />
                    )}
                    {/* A flex box, so the icon centres on the row like the link beside it. */}
                    <form action={removeAction} style={{ display: "flex" }}>
                      <input type="hidden" name="account_id" value={account.account_id} />
                      <input type="hidden" name="issuer" value={trust.issuer} />
                      <input type="hidden" name="subject" value={trust.subject} />
                      <Tooltip content="Remove">
                        <IconButton
                          type="submit"
                          size="1"
                          variant="ghost"
                          color="red"
                          disabled={removing}
                          aria-label={`Remove trust in ${trust.subject}`}
                        >
                          <Cross2Icon />
                        </IconButton>
                      </Tooltip>
                    </form>
                  </Flex>
                }
              />
            ))}
          </ConnectionList>
        )}
        <Status state={removeState} />
      </SectionHeader>

      <SectionHeader
        title="Can reach"
        description="The products it can read or write, each opened in a new tab to check what it holds. A change is saved at once, and takes effect on its next sign-in."
        rightButton={
          unreached.length > 0 && !drafting ? (
            <Button size="1" variant="soft" onClick={() => setDrafting(true)}>
              <PlusIcon /> Grant a product
            </Button>
          ) : undefined
        }
      >
        <ProductAccessList
          ownerAccountId={account.owner_account_id}
          products={products.filter((p) => access[p.product_id])}
          access={access}
          onChange={setAccess}
          onRemove={(product_id) => setAccess(product_id, null)}
          disabled={savingAccess}
          empty={
            products.length === 0
              ? `${account.owner_account_id} has no products yet.`
              : "Nothing yet. Grant a product to let it read or write data."
          }
        >
          {drafting && (
            <ConnectionRow
              title={
                <Select.Root
                  onValueChange={(product_id) => {
                    setDrafting(false);
                    setAccess(product_id, MembershipRole.ReadData);
                  }}
                >
                  <Select.Trigger placeholder="Choose a product" aria-label="Product to grant" />
                  <Select.Content position="popper">
                    {unreached.map(({ product_id, title }) => (
                      <Select.Item key={product_id} value={product_id}>
                        {title}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              }
              meta="Granted to read; change it once it is added."
              actions={
                <Tooltip content="Cancel">
                  <IconButton
                    type="button"
                    size="1"
                    variant="ghost"
                    color="gray"
                    aria-label="Cancel granting a product"
                    onClick={() => setDrafting(false)}
                  >
                    <Cross2Icon />
                  </IconButton>
                </Tooltip>
              }
            />
          )}
        </ProductAccessList>
        {!accessState.success && <Status state={accessState} />}
      </SectionHeader>

      <SectionHeader title="Danger zone" color="red">
        <Flex direction="column" gap="4">
          <Flex justify="between" align="center" gap="3" wrap="wrap">
            <Text size="2" color="gray">
              {account.disabled
                ? "Disabled: nothing can sign in as it. Its trusts and grants are kept."
                : "Disabling stops every sign-in and keeps its trusts and grants."}
            </Text>
            <form action={toggleAction}>
              <input type="hidden" name="account_id" value={account.account_id} />
              <input type="hidden" name="disabled" value={account.disabled ? "false" : "true"} />
              <Button type="submit" variant="soft" color={account.disabled ? "gray" : "red"} disabled={toggling}>
                {account.disabled ? "Enable" : "Disable"}
              </Button>
            </form>
          </Flex>
          <Status state={toggleState} />
          <Flex justify="between" align="center" gap="3" wrap="wrap">
            <Text size="2" color="gray">
              Deleting removes the account, its grants and its trusts.
            </Text>
            <AlertDialog.Root>
              <AlertDialog.Trigger>
                <Button variant="solid" color="red">
                  Delete
                </Button>
              </AlertDialog.Trigger>
              <AlertDialog.Content style={{ maxWidth: 440 }}>
                <AlertDialog.Title>Delete {account.name}?</AlertDialog.Title>
                <AlertDialog.Description size="2">
                  Every grant it holds and every way it signs in go with it. Credentials
                  it already obtained keep working until they expire.
                </AlertDialog.Description>
                <Flex justify="end" gap="3" mt="4">
                  <AlertDialog.Cancel>
                    <Button variant="soft" color="gray" disabled={deleting}>
                      Cancel
                    </Button>
                  </AlertDialog.Cancel>
                  <form action={deleteAction}>
                    <input type="hidden" name="account_id" value={account.account_id} />
                    {/* Not AlertDialog.Action: that closes the dialog on click,
                        before the action is dispatched. A deleted account
                        leaves for the list; a refused one stays to say why. */}
                    <Button type="submit" color="red" disabled={deleting} loading={deleting}>
                      Delete
                    </Button>
                  </form>
                </Flex>
                <Status state={deleteState} />
              </AlertDialog.Content>
            </AlertDialog.Root>
          </Flex>
        </Flex>
      </SectionHeader>
    </Flex>
  );
}
