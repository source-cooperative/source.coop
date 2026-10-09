export const LOCALES = ["en", "ja"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

/** next-intl's default cookie name; the switcher writes it, request.ts reads it. */
export const LOCALE_COOKIE = "NEXT_LOCALE";

/** Each language named in itself, so a reader can find theirs in the switcher. */
export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  ja: "日本語",
};

const isLocale = (value: string | undefined): value is Locale =>
  LOCALES.includes(value as Locale);

/**
 * The locale to render: an explicit choice from the switcher's cookie wins,
 * then the first supported language in the browser's Accept-Language, then
 * English. Locales live outside the URL because a `/ja` prefix would collide
 * with account ids, which own the top level of the path.
 */
export function negotiateLocale(
  cookie: string | undefined,
  acceptLanguage: string | null | undefined
): Locale {
  if (isLocale(cookie)) return cookie;
  const preferred = (acceptLanguage ?? "")
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=");
      return { base: tag.split("-")[0].toLowerCase(), q: q ? Number(q) : 1 };
    })
    .filter(({ q }) => q > 0)
    .sort((a, b) => b.q - a.q)
    .find(({ base }) => isLocale(base));
  return (preferred?.base as Locale) ?? DEFAULT_LOCALE;
}
