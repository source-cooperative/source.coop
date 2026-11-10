"use client";

import React, { startTransition, useActionState, useEffect, useOptimistic, useState } from "react";
import {
  AlertDialog,
  Box,
  Button,
  Code,
  DropdownMenu,
  Flex,
  IconButton,
  Link,
  Text,
  TextField,
  Tooltip,
} from "@radix-ui/themes";
import { DotsHorizontalIcon, ExternalLinkIcon, LockClosedIcon } from "@radix-ui/react-icons";
import { Field, SectionHeader } from "@/components/core";
import { ItemList } from "@/components/core/ItemList";
import {
  deleteServiceAccount,
  removeTrust,
  renameServiceAccount,
  setProductAccess,
  setServiceAccountDisabled,
} from "@/lib/actions/service-accounts";
import {
  GITHUB_ACTIONS_ISSUER,
  IDLE_SERVICE_ACCOUNT_ACTION_STATE as IDLE,
  parseGithubSubject,
  type AccountTrust,
  type Product,
  type ServiceAccountActionState,
  type ServiceAccountSummary,
} from "@/types";
import { AddSignInMenu, SIGN_IN_DESCRIPTION } from "./AddSignInMenu";
import { GrantProductDialog } from "./GrantProductDialog";
import { ProductAccessList, type ProductAccess } from "./ProductAccessList";
import { ExampleUsage, GITHUB_WORKFLOW_INTRO } from "./ExampleUsage";
import { githubWorkflow } from "@/lib/services/service-account-usage";
import { formatDate, formatRelative } from "@/lib/format";
import { IssuedApiKeyDialog } from "./IssuedApiKeyDialog";
import { ApiKeyList } from "./ApiKeyList";
import { AccountMention, type AccountsById } from "@/components/core/AccountMention";

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
  accounts,
}: {
  accountId: string;
  trust: AccountTrust;
  proxyOrigin?: string;
  onRemove: (trust: AccountTrust) => void;
  removing: boolean;
  accounts?: AccountsById;
}) {
  const [showingUsage, setShowingUsage] = useState(false);
  const example = proxyOrigin && trust.issuer === GITHUB_ACTIONS_ISSUER;
  const github = trust.issuer === GITHUB_ACTIONS_ISSUER ? parseGithubSubject(trust.subject) : null;
  return (
    <ItemList.Row
      title={
        github ? (
          // The repository, opening on GitHub; the exact subject on hover.
          <Flex align="center" gap="2">
            <Tooltip content={trust.subject}>
              {/* The row's name, so the same ink as an API key's; the icon
                  and the underline on hover say it is a link. */}
              <Link
                href={`https://github.com/${github.repo}`}
                target="_blank"
                rel="noopener noreferrer"
                size="2"
                weight="medium"
                color="gray"
                highContrast
                underline="hover"
                style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-1)", minWidth: 0, overflowWrap: "anywhere" }}
              >
                {github.repo}
                <ExternalLinkIcon width="12" height="12" aria-label="opens in a new tab" />
              </Link>
            </Tooltip>
            {github.pinned && (
              <Tooltip content="Pinned to the repository's ID, so a new repository given this name can't use it">
                <LockClosedIcon width="12" height="12" color="var(--gray-11)" aria-label="pinned to the repository's ID" />
              </Tooltip>
            )}
          </Flex>
        ) : (
          // Breaks after a `:` or `/` where it can, so a long subject wraps
          // between its parts rather than mid-word.
          <Text size="2" style={{ fontFamily: "var(--code-font-family)", overflowWrap: "anywhere" }}>
            {trust.subject.split(/(?<=[:/])/).map((part, i) => (
              <React.Fragment key={i}>
                {i > 0 && <wbr />}
                {part}
              </React.Fragment>
            ))}
          </Text>
        )
      }
      // Who added it, here rather than in the tooltip, which can't hold their
      // card. A GitHub trust names what it is pinned to in place of the
      // issuer, which the list's heading already gives.
      meta={
        <>
          {github ? `${github.kind} ${github.name}` : issuerLabel(trust.issuer)} · added by{" "}
          <AccountMention id={trust.created_by} accounts={accounts} />
        </>
      }
      aside={
        <Tooltip
          content={[
            `Added ${formatDate(trust.created_at, true)}`,
            trust.last_used_at && `Last used ${formatDate(trust.last_used_at, true)}`,
          ]
            .filter(Boolean)
            .join(" · ")}
        >
          <Text size="1" color="gray" style={{ cursor: "default" }}>
            {trust.last_used_at ? `Used ${formatRelative(trust.last_used_at)}` : "Never used"}
          </Text>
        </Tooltip>
      }
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
              intro={GITHUB_WORKFLOW_INTRO}
              {...githubWorkflow(proxyOrigin, accountId, trust.subject)}
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
 * One service account, and every control over it: its name, which can
 * change, beside its id, which cannot; how it signs in — the
 * workflows it trusts and its API keys, each with its example usage; the
 * products it reaches, changed, removed or granted with the create form's
 * controls and saved as they are; and — set apart — disabling and deleting it.
 */
export function ServiceAccountDetail({
  summary,
  products,
  proxyOrigin,
  accounts,
}: {
  summary: ServiceAccountSummary;
  /**
   * The owner, whoever added a trust, and whoever issued or revoked a key, for
   * their cards on hover.
   */
  accounts?: AccountsById;
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
    Object.fromEntries(grants.map((g) => [g.product_id ?? "", g.role as ProductAccess])),
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
  const [renameState, renameAction, renaming] = useActionState(renameServiceAccount, IDLE);
  const [name, setName] = useState(account.name);
  const [deleteState, deleteAction, deleting] = useActionState(deleteServiceAccount, IDLE);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  return (
    <Flex direction="column" gap="6">
      <IssuedApiKeyDialog accountId={account.account_id} />
      <SectionHeader
        title="Who it is"
        rightButton={account.disabled && <ItemList.Marker>Disabled</ItemList.Marker>}
      >
        <Flex direction="column" gap="4">
          <form action={renameAction}>
            <input type="hidden" name="account_id" value={account.account_id} />
            <Field label="Name" htmlFor="sa-name">
              <Flex gap="3">
                <Box flexGrow="1">
                  <TextField.Root
                    id="sa-name"
                    name="name"
                    size="3"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </Box>
                <Button
                  type="submit"
                  size="3"
                  highContrast
                  disabled={renaming || name.trim() === account.name}
                  loading={renaming}
                >
                  Save
                </Button>
              </Flex>
            </Field>
            <Status state={renameState} />
          </form>
          <Field label="Account ID" help="The handle software signs in as. Permanent once created." group>
            <Code size="2" variant="ghost" color="gray">
              {account.account_id}
            </Code>
          </Field>
        </Flex>
      </SectionHeader>

      <SectionHeader
        title="Signs in with"
        description={`${SIGN_IN_DESCRIPTION} Revoke a key that leaks, or disable the account below to stop every sign-in at once.`}
        rightButton={<AddSignInMenu accountId={account.account_id} proxyOrigin={proxyOrigin} />}
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
                      accounts={accounts}
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
                <ApiKeyList
                  accountId={account.account_id}
                  keys={keys}
                  proxyOrigin={proxyOrigin}
                  accounts={accounts}
                />
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
          accounts={accounts}
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
