"use client";

import React, { startTransition, useActionState, useEffect, useOptimistic, useState } from "react";
import {
  AlertDialog,
  Button,
  Code,
  DropdownMenu,
  Flex,
  Heading,
  IconButton,
  Text,
  TextField,
} from "@radix-ui/themes";
import { DotsHorizontalIcon } from "@radix-ui/react-icons";
import { Field, SectionHeader } from "@/components/core";
import { ItemList } from "@/components/core/ItemList";
import {
  deleteServiceAccount,
  removeTrust,
  setProductAccess,
  setServiceAccountDisabled,
} from "@/lib/actions/service-accounts";
import {
  GITHUB_ACTIONS_ISSUER,
  IDLE_SERVICE_ACCOUNT_ACTION_STATE as IDLE,
  type AccountTrust,
  type Product,
  type ServiceAccountActionState,
  type ServiceAccountSummary,
} from "@/types";
import { AddSignInMenu } from "./AddSignInMenu";
import { GrantProductDialog } from "./GrantProductDialog";
import { ProductAccessList, type ProductAccess } from "./ProductAccessList";
import { ExampleUsage } from "./ExampleUsage";
import { githubWorkflowStep } from "@/lib/services/service-account-usage";
import { IssuedApiKeyDialog } from "./IssuedApiKeyDialog";
import { ApiKeyList } from "./ApiKeyList";

const issuerLabel = (issuer: string) =>
  issuer === GITHUB_ACTIONS_ISSUER ? "GitHub Actions" : issuer;

function Status({ state }: { state: ServiceAccountActionState }) {
  return state.message ? (
    <Text as="p" size="1" color={state.success ? "green" : "red"} mt="2">
      {state.message}
    </Text>
  ) : null;
}

/** One trusted workflow, with a menu to see its example usage or remove it. */
function TrustRow({
  accountId,
  trust,
  proxyOrigin,
  onRemove,
  removing,
}: {
  accountId: string;
  trust: AccountTrust;
  proxyOrigin?: string;
  onRemove: (trust: AccountTrust) => void;
  removing: boolean;
}) {
  const [showingUsage, setShowingUsage] = useState(false);
  const example = proxyOrigin && trust.issuer === GITHUB_ACTIONS_ISSUER;
  return (
    <ItemList.Row
      title={
        <Text size="2" style={{ fontFamily: "var(--code-font-family)", wordBreak: "break-all" }}>
          {trust.subject}
        </Text>
      }
      meta={issuerLabel(trust.issuer)}
      actions={
        <>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger>
              <IconButton
                type="button"
                size="1"
                variant="ghost"
                color="gray"
                disabled={removing}
                aria-label={`Actions for ${trust.subject}`}
              >
                <DotsHorizontalIcon />
              </IconButton>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content align="end" size="1">
              {example && (
                <>
                  <DropdownMenu.Item onSelect={() => setShowingUsage(true)}>
                    Example usage
                  </DropdownMenu.Item>
                  <DropdownMenu.Separator />
                </>
              )}
              <DropdownMenu.Item color="red" onSelect={() => onRemove(trust)}>
                Remove
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Root>
          {example && (
            <ExampleUsage
              title="Sign in from this workflow"
              intro={
                <>
                  Add to the job in <Code>{trust.subject}</Code>, before it uses the data:
                </>
              }
              code={githubWorkflowStep(proxyOrigin, accountId)}
              language="yaml"
              open={showingUsage}
              onOpenChange={setShowingUsage}
            />
          )}
        </>
      }
    />
  );
}

/**
 * One service account, and every control over it: how it signs in — the
 * workflows it trusts and its API keys, each with its example usage; the
 * products it reaches, changed, removed or granted with the create form's
 * controls and saved as they are; and — set apart — disabling and deleting it.
 */
export function ServiceAccountDetail({
  summary,
  products,
  proxyOrigin,
}: {
  summary: ServiceAccountSummary;
  /** The owner's products, each of which it may reach. */
  products: Pick<Product, "product_id" | "title">[];
  /** The data proxy software signs in to; without it, no example usage is shown. */
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
  const removeTrustFrom = (trust: AccountTrust) => {
    const data = new FormData();
    data.set("account_id", account.account_id);
    data.set("issuer", trust.issuer);
    data.set("subject", trust.subject);
    startTransition(() => removeAction(data));
  };
  const [toggleState, toggleAction, toggling] = useActionState(setServiceAccountDisabled, IDLE);
  // Each answer from the action closes the confirmation; the result shows beneath the buttons.
  const [confirmingToggle, setConfirmingToggle] = useState(false);
  useEffect(() => setConfirmingToggle(false), [toggleState]);
  const [deleteState, deleteAction, deleting] = useActionState(deleteServiceAccount, IDLE);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  return (
    <Flex direction="column" gap="6">
      <IssuedApiKeyDialog accountId={account.account_id} />
      <Flex direction="column" gap="1">
        <Flex align="center" gap="2" wrap="wrap">
          <Heading size="5">{account.name}</Heading>
          {account.disabled && <ItemList.Marker>Disabled</ItemList.Marker>}
        </Flex>
        <Code size="2" variant="ghost" color="gray">
          {account.account_id}
        </Code>
      </Flex>

      <SectionHeader
        title="Signs in with"
        description="GitHub workflows it trusts, and API keys for environments without OIDC. A key is shown once, when it is issued; revoke one that leaks, or disable the account below to stop every sign-in at once."
        rightButton={<AddSignInMenu accountId={account.account_id} />}
      >
        {trusts.length === 0 && keys.length === 0 ? (
          <Text size="2" color="gray">
            Nothing yet — it cannot sign in until a workflow is trusted or a key is issued.
          </Text>
        ) : (
          <Flex direction="column" gap="4">
            {trusts.length > 0 && (
              <Flex direction="column" gap="2">
                <Text size="1" weight="medium" color="gray">
                  GitHub workflows
                </Text>
                <ItemList.Root>
                  {trusts.map((trust) => (
                    <TrustRow
                      key={`${trust.issuer} ${trust.subject}`}
                      accountId={account.account_id}
                      trust={trust}
                      proxyOrigin={proxyOrigin}
                      onRemove={removeTrustFrom}
                      removing={removing}
                    />
                  ))}
                </ItemList.Root>
              </Flex>
            )}
            {keys.length > 0 && (
              <Flex direction="column" gap="2">
                <Text size="1" weight="medium" color="gray">
                  API keys
                </Text>
                <ApiKeyList accountId={account.account_id} keys={keys} proxyOrigin={proxyOrigin} />
              </Flex>
            )}
          </Flex>
        )}
        {/* Outside the lists, so removing the last trust still says how it went. */}
        <Status state={removeState} />
      </SectionHeader>

      <SectionHeader
        title="Can reach"
        description="The products it can read or write, each opened in a new tab to check what it holds. A change is saved at once, and takes effect on its next sign-in."
        rightButton={
          <GrantProductDialog
            ownerAccountId={account.owner_account_id}
            available={products.filter((p) => !access[p.product_id])}
            onGrant={setAccess}
            disabled={savingAccess}
          />
        }
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
        {/* Each button explains itself in the modal that confirms it. */}
        <Flex gap="3" wrap="wrap" justify="end">
          <AlertDialog.Root open={confirmingToggle} onOpenChange={setConfirmingToggle}>
            <AlertDialog.Trigger>
              <Button variant="soft" color={account.disabled ? "gray" : "red"}>
                {account.disabled ? "Enable" : "Disable"}
              </Button>
            </AlertDialog.Trigger>
            <AlertDialog.Content style={{ maxWidth: 440 }}>
              <AlertDialog.Title>
                {account.disabled ? "Enable" : "Disable"} {account.name}?
              </AlertDialog.Title>
              <AlertDialog.Description size="2">
                {account.disabled
                  ? "Its trusted workflows and unrevoked API keys can sign in again, so revoke any key that leaked first."
                  : "Nothing can sign in as it, by workflow or by API key, and within five minutes credentials already generated are cut back to public data. Its workflows, keys and product access are kept."}
              </AlertDialog.Description>
              <Flex justify="end" gap="3" mt="4">
                <AlertDialog.Cancel>
                  <Button variant="soft" color="gray" disabled={toggling}>
                    Cancel
                  </Button>
                </AlertDialog.Cancel>
                <form action={toggleAction}>
                  <input type="hidden" name="account_id" value={account.account_id} />
                  <input type="hidden" name="disabled" value={account.disabled ? "false" : "true"} />
                  {/* Not AlertDialog.Action, as with Delete below: the modal
                      closes once the action has answered. */}
                  <Button type="submit" color={account.disabled ? undefined : "red"} highContrast={account.disabled} disabled={toggling} loading={toggling}>
                    {account.disabled ? "Enable" : "Disable"}
                  </Button>
                </form>
              </Flex>
            </AlertDialog.Content>
          </AlertDialog.Root>
          {/* Typing the id clears on close, so every open asks again. */}
          <AlertDialog.Root onOpenChange={() => setDeleteConfirmation("")}>
            <AlertDialog.Trigger>
              <Button variant="solid" color="red">
                Delete
              </Button>
            </AlertDialog.Trigger>
            <AlertDialog.Content style={{ maxWidth: 440 }}>
              <AlertDialog.Title>Delete {account.name}?</AlertDialog.Title>
              <AlertDialog.Description size="2" mb="4">
                Its workflows and API keys stop working, and it loses access to every
                product. Credentials already generated last until they expire. This
                cannot be undone.
              </AlertDialog.Description>
              <Field
                label={
                  <>
                    Type <Code size="2">{account.account_id}</Code> to confirm
                  </>
                }
                htmlFor="delete-confirmation"
              >
                <TextField.Root
                  id="delete-confirmation"
                  autoComplete="off"
                  spellCheck={false}
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                />
              </Field>
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
                  <Button
                    type="submit"
                    color="red"
                    disabled={deleting || deleteConfirmation !== account.account_id}
                    loading={deleting}
                  >
                    Delete
                  </Button>
                </form>
              </Flex>
              <Status state={deleteState} />
            </AlertDialog.Content>
          </AlertDialog.Root>
        </Flex>
        <Flex justify="end">
          <Status state={toggleState} />
        </Flex>
      </SectionHeader>
    </Flex>
  );
}
