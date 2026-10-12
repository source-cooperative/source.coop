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
  Text,
  TextField,
} from "@radix-ui/themes";
import { DotsHorizontalIcon } from "@radix-ui/react-icons";
import { useTranslations } from "next-intl";
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
  type AccountTrust,
  type Product,
  type ServiceAccountActionState,
  type ServiceAccountSummary,
} from "@/types";
import { AddSignInMenu } from "./AddSignInMenu";
import { GrantProductDialog } from "./GrantProductDialog";
import { ProductAccessList, type ProductAccess } from "./ProductAccessList";
import { ExampleUsage, GITHUB_WORKFLOW_INTRO } from "./ExampleUsage";
import { githubWorkflow } from "@/lib/services/service-account-usage";
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
  const t = useTranslations("ServiceAccountDetail");
  const tc = useTranslations("Common");
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
                aria-label={t("actionsFor", { subject: trust.subject })}
              >
                <DotsHorizontalIcon />
              </IconButton>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content align="end" size="1">
              {example && (
                <>
                  <DropdownMenu.Item onSelect={() => setShowingUsage(true)}>
                    {t("exampleUsage")}
                  </DropdownMenu.Item>
                  <DropdownMenu.Separator />
                </>
              )}
              <DropdownMenu.Item color="red" onSelect={() => onRemove(trust)}>
                {tc("remove")}
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Root>
          {example && (
            <ExampleUsage
              title={t("signInFromWorkflow")}
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
}: {
  summary: ServiceAccountSummary;
  /** The owner's products, each of which it may reach. */
  products: Pick<Product, "product_id" | "title">[];
  /** The data proxy software signs in to; without it, no example usage is shown. */
  proxyOrigin?: string;
}) {
  const { account, trusts, grants, keys } = summary;
  const t = useTranslations("ServiceAccountDetail");
  const tc = useTranslations("Common");
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
  const [renameState, renameAction, renaming] = useActionState(renameServiceAccount, IDLE);
  const [name, setName] = useState(account.name);
  const [deleteState, deleteAction, deleting] = useActionState(deleteServiceAccount, IDLE);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  return (
    <Flex direction="column" gap="6">
      <IssuedApiKeyDialog accountId={account.account_id} />
      <SectionHeader
        title={t("whoItIs")}
        rightButton={account.disabled && <ItemList.Marker>{t("disabled")}</ItemList.Marker>}
      >
        <Flex direction="column" gap="4">
          <form action={renameAction}>
            <input type="hidden" name="account_id" value={account.account_id} />
            <Field label={t("name")} htmlFor="sa-name">
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
                  {tc("save")}
                </Button>
              </Flex>
            </Field>
            <Status state={renameState} />
          </form>
          <Field label={t("accountId")} help={t("accountIdHelp")} group>
            <Code size="2" variant="ghost" color="gray">
              {account.account_id}
            </Code>
          </Field>
        </Flex>
      </SectionHeader>

      <SectionHeader
        title={t("signsInWith")}
        description={t("signInDescription")}
        rightButton={<AddSignInMenu accountId={account.account_id} proxyOrigin={proxyOrigin} />}
      >
        {trusts.length === 0 && keys.length === 0 ? (
          <Text size="2" color="gray">
            {t("nothingYet")}
          </Text>
        ) : (
          <Flex direction="column" gap="4">
            {trusts.length > 0 && (
              <Flex direction="column" gap="2">
                <Text size="1" weight="medium" color="gray">
                  {t("githubWorkflows")}
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
                  {t("apiKeys")}
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
        title={t("canReach")}
        description={t("canReachDescription")}
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

      <SectionHeader title={t("dangerZone")} color="red">
        {/* Each button explains itself in the modal that confirms it. */}
        <Flex gap="3" wrap="wrap" justify="end">
          <AlertDialog.Root open={confirmingToggle} onOpenChange={setConfirmingToggle}>
            <AlertDialog.Trigger>
              <Button variant="soft" color={account.disabled ? "gray" : "red"}>
                {account.disabled ? t("enable") : t("disable")}
              </Button>
            </AlertDialog.Trigger>
            <AlertDialog.Content style={{ maxWidth: 440 }}>
              <AlertDialog.Title>
                {account.disabled
                  ? t("enableTitle", { name: account.name })
                  : t("disableTitle", { name: account.name })}
              </AlertDialog.Title>
              <AlertDialog.Description size="2">
                {account.disabled
                  ? t("enableDescription")
                  : t("disableDescription")}
              </AlertDialog.Description>
              <Flex justify="end" gap="3" mt="4">
                <AlertDialog.Cancel>
                  <Button variant="soft" color="gray" disabled={toggling}>
                    {tc("cancel")}
                  </Button>
                </AlertDialog.Cancel>
                <form action={toggleAction}>
                  <input type="hidden" name="account_id" value={account.account_id} />
                  <input type="hidden" name="disabled" value={account.disabled ? "false" : "true"} />
                  {/* Not AlertDialog.Action, as with Delete below: the modal
                      closes once the action has answered. */}
                  <Button type="submit" color={account.disabled ? undefined : "red"} highContrast={account.disabled} disabled={toggling} loading={toggling}>
                    {account.disabled ? t("enable") : t("disable")}
                  </Button>
                </form>
              </Flex>
            </AlertDialog.Content>
          </AlertDialog.Root>
          {/* Typing the id clears on close, so every open asks again. */}
          <AlertDialog.Root onOpenChange={() => setDeleteConfirmation("")}>
            <AlertDialog.Trigger>
              <Button variant="solid" color="red">
                {tc("delete")}
              </Button>
            </AlertDialog.Trigger>
            <AlertDialog.Content style={{ maxWidth: 440 }}>
              <AlertDialog.Title>{t("deleteTitle", { name: account.name })}</AlertDialog.Title>
              <AlertDialog.Description size="2" mb="4">
                {t("deleteDescription")}
              </AlertDialog.Description>
              <Field
                label={t.rich("typeToConfirm", {
                  accountId: account.account_id,
                  code: (chunks) => <Code size="2">{chunks}</Code>,
                })}
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
                    {tc("cancel")}
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
                    {tc("delete")}
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
