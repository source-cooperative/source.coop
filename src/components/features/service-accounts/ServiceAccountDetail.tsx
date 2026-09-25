"use client";

import React, { startTransition, useActionState, useOptimistic } from "react";
import {
  AlertDialog,
  Button,
  Code,
  Dialog,
  Flex,
  Heading,
  IconButton,
  Text,
  Tooltip,
} from "@radix-ui/themes";
import { Cross2Icon } from "@radix-ui/react-icons";
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
import { revokeApiKey, setApiKeyExpiry } from "@/lib/actions/service-account-keys";
import {
  GITHUB_ACTIONS_ISSUER,
  IDLE_API_KEY_ACTION_STATE,
  IDLE_SERVICE_ACCOUNT_ACTION_STATE as IDLE,
  type Product,
  isKeyActive,
  type ServiceAccountActionState,
  type ServiceAccountKey,
  type ServiceAccountSummary,
} from "@/types";
import { AddGithubTrustDialog } from "./AddGithubTrustDialog";
import { ProductAccessList, type ProductAccess } from "./ProductAccessList";
import { WorkflowSnippet } from "./WorkflowSnippet";
import { IssueApiKeyDialog } from "./IssueApiKeyDialog";
import { ApiKeyExpiryField } from "./ApiKeyExpiryField";

const issuerLabel = (issuer: string) =>
  issuer === GITHUB_ACTIONS_ISSUER ? "GitHub Actions" : issuer;

const day = (iso: string) => new Date(iso).toLocaleDateString();

/** Only a key that no longer works is marked; a live one is the norm. */
const keyMarker = (key: ServiceAccountKey) =>
  key.revoked_at ? "Revoked" : isKeyActive(key) ? null : "Expired";

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
 * A new expiry for a live key, counted from now, in a modal: longer for a
 * workload that needs it, shorter during an incident, or never.
 */
function ChangeExpiry({ accountId, apiKey }: { accountId: string; apiKey: ServiceAccountKey }) {
  const [state, action, saving] = useActionState(setApiKeyExpiry, IDLE_API_KEY_ACTION_STATE);
  return (
    <Dialog.Root>
      <Dialog.Trigger>
        <Button size="1" variant="ghost">
          Change expiry
        </Button>
      </Dialog.Trigger>
      <Dialog.Content style={{ maxWidth: 440 }} aria-describedby={undefined}>
        <Dialog.Title>When should {apiKey.label} expire?</Dialog.Title>
        <form action={action}>
          <input type="hidden" name="account_id" value={accountId} />
          <input type="hidden" name="key_id" value={apiKey.key_id} />
          <Flex direction="column" gap="3">
            <ApiKeyExpiryField id={`expiry-${apiKey.key_id}`} never={apiKey.expires_at === null} />
            <Status state={state} />
            <Flex justify="end" gap="2">
              <Dialog.Close>
                <Button type="button" variant="soft" color="gray">
                  Close
                </Button>
              </Dialog.Close>
              <Button type="submit" disabled={saving}>
                Save
              </Button>
            </Flex>
          </Flex>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
}

/**
 * One service account, and every control over it: the workflows it trusts,
 * each with its example usage; its API keys; the products it reaches, changed, removed or
 * granted with the create form's controls and saved as they are; and — set
 * apart — disabling and deleting it.
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
  const { account, trusts, grants, keys } = summary;
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
  const setAccess = (product_id: string, next: ProductAccess | null) => {
    const data = new FormData();
    data.set("account_id", account.account_id);
    data.set("product_id", product_id);
    data.set("access", next ?? "none");
    startTransition(() => {
      chooseAccess([product_id, next]);
      accessAction(data);
    });
  };
  const [removeState, removeAction, removing] = useActionState(removeTrust, IDLE);
  const [revokeState, revokeAction, revoking] = useActionState(revokeApiKey, IDLE_API_KEY_ACTION_STATE);
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
        title="API keys"
        description="For environments without OIDC. Each is shown once, when it is issued. Revoke a key that leaks; to stop every key at once, disable the account below."
        rightButton={<IssueApiKeyDialog accountId={account.account_id} proxyOrigin={proxyOrigin} />}
      >
        {keys.length === 0 ? (
          <Text size="2" color="gray">
            None.
          </Text>
        ) : (
          <ConnectionList>
            {keys.map((key) => {
              const marker = keyMarker(key);
              return (
                <ConnectionRow
                  key={key.key_id}
                  title={
                    <Text size="2" weight="medium">
                      {key.label}
                    </Text>
                  }
                  markers={marker && <ConnectionMarker>{marker}</ConnectionMarker>}
                  meta={[
                    `issued ${day(key.created_at)}`,
                    key.expires_at ? `expires ${day(key.expires_at)}` : "never expires",
                    key.last_used_at ? `last used ${day(key.last_used_at)}` : "never used",
                  ].join(" · ")}
                  actions={
                    !key.revoked_at && (
                      <Flex align="center" gap="3">
                        <ChangeExpiry accountId={account.account_id} apiKey={key} />
                        {/* A flex box, so the button centres on the row like the one beside it. */}
                        <form action={revokeAction} style={{ display: "flex" }}>
                          <input type="hidden" name="account_id" value={account.account_id} />
                          <input type="hidden" name="key_id" value={key.key_id} />
                          <Button type="submit" size="1" variant="ghost" color="red" disabled={revoking}>
                            Revoke
                          </Button>
                        </form>
                      </Flex>
                    )
                  }
                />
              );
            })}
          </ConnectionList>
        )}
        <Status state={revokeState} />
      </SectionHeader>

      <SectionHeader
        title="Can reach"
        description="The products it can read or write, each opened in a new tab to check what it holds. A change is saved at once, and takes effect on its next sign-in."
      >
        <ProductAccessList
          ownerAccountId={account.owner_account_id}
          products={products}
          access={access}
          onChange={setAccess}
          disabled={savingAccess}
        />
        {!accessState.success && <Status state={accessState} />}
      </SectionHeader>

      <SectionHeader title="Danger zone" color="red">
        <Flex direction="column" gap="4">
          <Flex justify="between" align="center" gap="3" wrap="wrap">
            <Text size="2" color="gray">
              {account.disabled
                ? "Disabled: nothing can sign in as it. Enabling it lets its trusted workflows and unrevoked keys sign in again, so revoke any key that leaked first."
                : "Disabling stops every sign-in, by workflow or by key, and within five minutes cuts credentials it already holds back to public data. Its trusts, keys and grants are kept."}
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
