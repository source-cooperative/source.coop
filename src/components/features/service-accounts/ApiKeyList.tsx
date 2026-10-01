"use client";

import { startTransition, useActionState, useState } from "react";
import { Button, Dialog, DropdownMenu, Flex, IconButton, Text, Tooltip } from "@radix-ui/themes";
import { DotsHorizontalIcon } from "@radix-ui/react-icons";
import {
  ConnectionList,
  ConnectionMarker,
  ConnectionRow,
} from "@/components/features/data-connections/ConnectionRow";
import { revokeApiKey, setApiKeyExpiry } from "@/lib/actions/service-account-keys";
import {
  IDLE_API_KEY_ACTION_STATE,
  isKeyActive,
  maskedApiKey,
  type ApiKeyActionState,
  type RevokedVia,
  type ServiceAccountKey,
} from "@/types";
import { ApiKeyExpiryField } from "./ApiKeyExpiryField";
import { ExampleUsage } from "./ExampleUsage";
import { apiKeyEnvironment } from "@/lib/services/service-account-usage";

function Status({ state }: { state: ApiKeyActionState }) {
  return state.message ? (
    <Text as="p" size="1" color={state.success ? "green" : "red"} mt="2">
      {state.message}
    </Text>
  ) : null;
}

const date = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

const RELATIVE = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
const DAY_MS = 86_400_000;
/** "3 days ago", "in 5 months": the row's reading; the exact date is in its tooltip. */
const relative = (iso: string, now = Date.now()) => {
  const days = Math.round((Date.parse(iso) - now) / DAY_MS);
  if (Math.abs(days) < 30) return RELATIVE.format(days, "day");
  if (Math.abs(days) < 365) return RELATIVE.format(Math.round(days / 30), "month");
  return RELATIVE.format(Math.round(days / 365), "year");
};

/** What a key's row says of it, in two short lines: its use, then its end. */
const keyStanding = (key: ServiceAccountKey) => ({
  used: key.last_used_at ? `Used ${relative(key.last_used_at)}` : "Never used",
  ends: key.revoked_at
    ? `Revoked ${relative(key.revoked_at)}`
    : key.expires_at === null
      ? "Never expires"
      : Date.parse(key.expires_at) > Date.now()
        ? `Expires ${relative(key.expires_at)}`
        : `Expired ${relative(key.expires_at)}`,
});

const REVOKED_VIA: Record<RevokedVia, string> = {
  owner: " in settings",
  holder: " by someone holding it",
  github: " after GitHub found it in public",
};

/** The row's exact dates, and who revoked it, for its tooltip. */
const keyDates = (key: ServiceAccountKey) =>
  [
    `Issued ${date(key.created_at)} by ${key.created_by}`,
    key.last_used_at && `Last used ${date(key.last_used_at)}`,
    key.revoked_at
      ? `Revoked ${date(key.revoked_at)}${key.revoked_via ? REVOKED_VIA[key.revoked_via] : ""}`
      : key.expires_at
        ? `Expires ${date(key.expires_at)}`
        : "Never expires",
  ]
    .filter(Boolean)
    .join(" · ");

/**
 * One API key: its label and hint, how it has been used and when it ends, and
 * a menu with its example usage while it works and the two things done to it.
 * Everything else is in the tooltip.
 */
function KeyRow({
  accountId,
  apiKey,
  onRevoke,
  revoking,
  proxyOrigin,
}: {
  accountId: string;
  apiKey: ServiceAccountKey;
  onRevoke: (key_id: string) => void;
  revoking: boolean;
  proxyOrigin?: string;
}) {
  const [changingExpiry, setChangingExpiry] = useState(false);
  const [showingUsage, setShowingUsage] = useState(false);
  const marker = keyMarker(apiKey);
  const standing = keyStanding(apiKey);
  return (
    <ConnectionRow
      title={
        <Text size="2" weight="medium">
          {apiKey.label}
        </Text>
      }
      markers={marker && <ConnectionMarker>{marker}</ConnectionMarker>}
      meta={maskedApiKey(apiKey) ?? undefined}
      aside={
        <Tooltip content={keyDates(apiKey)}>
          <Flex direction="column" align="end" style={{ cursor: "default" }}>
            <Text size="1" color="gray">
              {standing.used}
            </Text>
            <Text size="1" color="gray">
              {standing.ends}
            </Text>
          </Flex>
        </Tooltip>
      }
      actions={
        // A revoked key has nothing left to do, but keeps an invisible copy of
        // the menu button, negative margins and all, so its dates line up with
        // the rows above and below.
        apiKey.revoked_at ? (
          <IconButton size="1" variant="ghost" tabIndex={-1} aria-hidden style={{ visibility: "hidden" }}>
            <DotsHorizontalIcon />
          </IconButton>
        ) : (
          <>
            <DropdownMenu.Root>
              <DropdownMenu.Trigger>
                <IconButton
                  type="button"
                  size="1"
                  variant="ghost"
                  color="gray"
                  disabled={revoking}
                  aria-label={`Actions for ${apiKey.label}`}
                >
                  <DotsHorizontalIcon />
                </IconButton>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content align="end">
                {/* Only a key that works has a use to show. */}
                {proxyOrigin && isKeyActive(apiKey) && (
                  <DropdownMenu.Item onSelect={() => setShowingUsage(true)}>
                    Example usage
                  </DropdownMenu.Item>
                )}
                <DropdownMenu.Item onSelect={() => setChangingExpiry(true)}>
                  Change expiry
                </DropdownMenu.Item>
                <DropdownMenu.Separator />
                <DropdownMenu.Item color="red" onSelect={() => onRevoke(apiKey.key_id)}>
                  Revoke
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Root>
            {proxyOrigin && (
              <ExampleUsage
                title={`Sign in with ${apiKey.label}`}
                intro="Save the key to a file, then point any AWS SDK or the AWS CLI at it:"
                code={apiKeyEnvironment(proxyOrigin, accountId)}
                language="shell"
                open={showingUsage}
                onOpenChange={setShowingUsage}
              />
            )}
            <ChangeExpiry
              accountId={accountId}
              apiKey={apiKey}
              open={changingExpiry}
              onOpenChange={setChangingExpiry}
            />
          </>
        )
      }
    />
  );
}

/** Only a key that no longer works is marked; a live one is the norm. */
const keyMarker = (key: ServiceAccountKey) =>
  key.revoked_at ? "Revoked" : isKeyActive(key) ? null : "Expired";

/**
 * A new expiry for a live key, counted from now, in a modal: longer for a
 * workload that needs it, shorter during an incident, or never.
 */
function ChangeExpiry({
  accountId,
  apiKey,
  open,
  onOpenChange,
}: {
  accountId: string;
  apiKey: ServiceAccountKey;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [state, action, saving] = useActionState(setApiKeyExpiry, IDLE_API_KEY_ACTION_STATE);
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
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
 * A service account's API keys, one row each: its label and hint, how it has
 * been used and when it ends, and a menu to see its example usage while it
 * works, change its expiry or revoke it.
 */
export function ApiKeyList({
  accountId,
  keys,
  proxyOrigin,
}: {
  accountId: string;
  keys: ServiceAccountKey[];
  /** The data proxy a key signs in to; without it, no example usage is shown. */
  proxyOrigin?: string;
}) {
  const [revokeState, revokeAction, revoking] = useActionState(revokeApiKey, IDLE_API_KEY_ACTION_STATE);
  const revokeKey = (key_id: string) => {
    const data = new FormData();
    data.set("account_id", accountId);
    data.set("key_id", key_id);
    startTransition(() => revokeAction(data));
  };
  if (keys.length === 0) {
    return (
      <Text size="2" color="gray">
        None.
      </Text>
    );
  }
  return (
    <>
      <ConnectionList>
        {keys.map((key) => (
          <KeyRow
            key={key.key_id}
            accountId={accountId}
            apiKey={key}
            onRevoke={revokeKey}
            revoking={revoking}
            proxyOrigin={proxyOrigin}
          />
        ))}
      </ConnectionList>
      <Status state={revokeState} />
    </>
  );
}
