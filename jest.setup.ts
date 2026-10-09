// jest.setup.ts
import { jest } from "@jest/globals";
import { Request, Response, Headers, fetch } from "undici";
import "@testing-library/jest-dom";

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => "/",
}));

// Components read their strings through next-intl, which needs a provider on
// the client and a request on the server. Tests have neither, so both resolve
// against the real English catalog, and assertions match the text users see.
const intl = () => {
  const { createTranslator, createFormatter } = jest.requireActual<
    typeof import("use-intl/core")
  >("use-intl/core");
  const messages = jest.requireActual("@/i18n/messages/en.json") as Record<
    string,
    never
  >;
  const config = { locale: "en", timeZone: "UTC", messages } as const;
  return {
    t: (namespace?: string) =>
      createTranslator({ ...config, namespace: namespace as never }),
    format: () => createFormatter(config),
  };
};
jest.mock("next-intl", () => {
  const { t, format } = intl();
  return {
    useTranslations: t,
    useFormatter: format,
    useLocale: () => "en",
    useTimeZone: () => "UTC",
    useNow: () => new Date(),
    NextIntlClientProvider: ({ children }: { children: unknown }) => children,
  };
});
jest.mock("next-intl/server", () => {
  const { t, format } = intl();
  return {
    getTranslations: async (
      arg?: string | { namespace?: string }
    ) => t(typeof arg === "string" ? arg : arg?.namespace),
    getFormatter: async () => format(),
    getLocale: async () => "en",
    getRequestConfig: (fn: unknown) => fn,
  };
});

// @ts-ignore
global.Request = Request;
// @ts-ignore
global.Response = Response;
// @ts-ignore
global.Headers = Headers;
// @ts-ignore
global.fetch = fetch;

// Global mock for @/lib/config - can be overridden in individual test files
jest.mock("@/lib/config", () => ({
  CONFIG: {
    storage: {
      type: "S3",
      endpoint: "http://localhost:9000",
      region: "us-east-1",
      credentials: {
        accessKeyId: "test",
        secretAccessKey: "test",
      },
    },
    environment: {
      isDevelopment: false,
      isTest: true,
      stage: "test",
    },
    auth: {
      api: {
        backendUrl: "http://localhost:4000",
        frontendUrl: "http://localhost:4000",
      },
      accessToken: "test-token",
      routes: {
        login: "http://localhost:4000/self-service/login/browser",
        logout: "http://localhost:4000/self-service/logout/browser",
      },
    },
    // 32 zero bytes, base64 — a valid key for the encrypted-cookie helpers.
    proxyCredentialsCookieKey: Buffer.alloc(32).toString("base64"),
    // Unconfigured by default so analytics components no-op in unrelated
    // tests; the analytics client's own tests mock this with real values.
    analytics: { accountId: "", apiToken: "", dataset: "" },
  },
}));
