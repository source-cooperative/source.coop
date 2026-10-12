"use client";

import { Select } from "@radix-ui/themes";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { LOCALE_COOKIE, LOCALE_NAMES, LOCALES } from "@/i18n/locales";

/**
 * Pins the display language. The choice is a cookie rather than a URL prefix,
 * so writing it client-side and refreshing re-renders the same page in the new
 * language without a server action.
 */
export function LocaleSwitcher() {
  const t = useTranslations("LocaleSwitcher");
  const locale = useLocale();
  const router = useRouter();

  const choose = (next: string) => {
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  };

  return (
    <Select.Root size="1" value={locale} onValueChange={choose}>
      <Select.Trigger variant="ghost" color="gray" aria-label={t("label")} />
      <Select.Content>
        {LOCALES.map((l) => (
          <Select.Item key={l} value={l} lang={l}>
            {LOCALE_NAMES[l]}
          </Select.Item>
        ))}
      </Select.Content>
    </Select.Root>
  );
}
