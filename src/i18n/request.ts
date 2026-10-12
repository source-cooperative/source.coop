import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { LOCALE_COOKIE, negotiateLocale } from "./locales";

export default getRequestConfig(async () => {
  const locale = negotiateLocale(
    (await cookies()).get(LOCALE_COOKIE)?.value,
    (await headers()).get("accept-language")
  );
  return {
    locale,
    // Server-rendered dates must match the client's on hydration, so both
    // sides format in one fixed zone rather than each in its own.
    timeZone: "UTC",
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
