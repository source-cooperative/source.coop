"use client";

import { startTransition, useActionState, useState } from "react";
import { Button, Dialog, DropdownMenu, Flex, IconButton, Text, Tooltip } from "@radix-ui/themes";
import { DotsHorizontalIcon } from "@radix-ui/react-icons";
import { useLocale, useTranslations } from "next-intl";
import { ItemList } from "@/components/core/ItemList";
import { revokeApiKey, setApiKeyExpiry } from "@/lib/actions/service-account-keys";
import {
  IDLE_API_KEY_ACTION_STATE,
  isKeyActive,
  maskedApiKey,
  type ApiKeyActionState,
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

const date = (iso: string, locale: string) =>
  new Date(iso).toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" });

const DAY_MS = 86_400_000;
/** "3 days ago", "in 5 months": the row's reading; the exact date is in its tooltip. */
const relative = (iso: string, locale: string, now = Date.now()) => {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const days = Math.round((Date.parse(iso) - now) / DAY_MS);
  if (Math.abs(days) < 30) return rtf.format(days, "day");
  if (Math.abs(days) < 365) return rtf.format(Math.round(days / 30), "month");
  return rtf.format(Math.round(days / 365), "year");
};

type T = ReturnType<typeof useTranslations<"ApiKeyList">>;

/** "Revoked …" with who revoked a key — the person, an anonymous holder, or GitHub. */
const revoked = (t: T, key: ServiceAccountKey, when: string) =>
  t("revoked", {
    when,
    via: key.revoked_by ? "person" : (key.revoked_via ?? "none"),
    who: key.revoked_by ?? "",
  });

/** What a key's row says of it, in two short lines: its use, then its end. */
const keyStanding = (t: T, key: ServiceAccountKey, locale: string) => ({
  used: key.last_used_at ? t("used", { when: relative(key.last_used_at, locale) }) : t("neverUsed"),
  ends: key.revoked_at
    ? revoked(t, key, relative(key.revoked_at, locale))
    : key.expires_at === null
      ? t("neverExpires")
      : Date.parse(key.expires_at) > Date.now()
        ? t("expires", { when: relative(key.expires_at, locale) })
        : t("expired", { when: relative(key.expires_at, locale) }),
});

/** The row's exact dates, and who revoked it, for its tooltip. */
const keyDates = (t: T, key: ServiceAccountKey, locale: string) =>
  [
    t("issued", { when: date(key.created_at, locale), who: key.created_by }),
    key.last_used_at && t("lastUsed", { when: date(key.last_used_at, locale) }),
    key.revoked_at
      ? revoked(t, key, date(key.revoked_at, locale))
      : key.expires_at
        ? t("expires", { when: date(key.expires_at, locale) })
        : t("neverExpires"),
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
  const t = useTranslations("ApiKeyList");
  const marker = keyMarker(t, apiKey);
  const locale = useLocale();
  const standing = keyStanding(t, apiKey, locale);
  return (
    <ItemList.Row
      title={
        <Text size="2" weight="medium">
          {apiKey.label}
        </Text>
      }
      markers={marker && <ItemList.Marker>{marker}</ItemList.Marker>}
      meta={maskedApiKey(apiKey) ?? undefined}
      aside={
        <Tooltip content={keyDates(t, apiKey, locale)}>
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
                  aria-label={t("actionsFor", { label: apiKey.label })}
                >
                  <DotsHorizontalIcon />
                </IconButton>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content align="end" size="1">
                {/* Only a key that works has a use to show. */}
                {proxyOrigin && isKeyActive(apiKey) && (
                  <DropdownMenu.Item onSelect={() => setShowingUsage(true)}>
                    {t("exampleUsage")}
                  </DropdownMenu.Item>
                )}
                <DropdownMenu.Item onSelect={() => setChangingExpiry(true)}>
                  {t("changeExpiry")}
                </DropdownMenu.Item>
                <DropdownMenu.Separator />
                <DropdownMenu.Item color="red" onSelect={() => onRevoke(apiKey.key_id)}>
                  {t("revoke")}
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Root>
            {proxyOrigin && (
              <ExampleUsage
                title={t("signInWith", { label: apiKey.label })}
                intro={t("usageIntro")}
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
const keyMarker = (t: T, key: ServiceAccountKey) =>
  key.revoked_at ? t("markerRevoked") : isKeyActive(key) ? null : t("markerExpired");

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
  const t = useTranslations("ApiKeyList");
  const tc = useTranslations("Common");
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content style={{ maxWidth: 440 }} aria-describedby={undefined}>
        <Dialog.Title>{t("expiryTitle", { label: apiKey.label })}</Dialog.Title>
        <form action={action}>
          <input type="hidden" name="account_id" value={accountId} />
          <input type="hidden" name="key_id" value={apiKey.key_id} />
          <Flex direction="column" gap="3">
            <ApiKeyExpiryField id={`expiry-${apiKey.key_id}`} never={apiKey.expires_at === null} />
            <Status state={state} />
            <Flex justify="end" gap="2">
              <Dialog.Close>
                <Button type="button" variant="soft" color="gray">
                  {tc("close")}
                </Button>
              </Dialog.Close>
              <Button type="submit" highContrast disabled={saving}>
                {tc("save")}
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
  const t = useTranslations("ApiKeyList");
  const revokeKey = (key_id: string) => {
    const data = new FormData();
    data.set("account_id", accountId);
    data.set("key_id", key_id);
    startTransition(() => revokeAction(data));
  };
  if (keys.length === 0) {
    return (
      <Text size="2" color="gray">
        {t("none")}
      </Text>
    );
  }
  return (
    <>
      <ItemList.Root>
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
      </ItemList.Root>
      <Status state={revokeState} />
    </>
  );
}
