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
      api: { backendUrl: "http://localhost:4000" },
      accessToken: "test-token",
    },
    // 32 zero bytes, base64 — a valid key for the encrypted-cookie helpers.
    proxyCredentialsCookieKey: Buffer.alloc(32).toString("base64"),
    // Unconfigured by default so analytics components no-op in unrelated
    // tests; the analytics client's own tests mock this with real values.
    analytics: { accountId: "", apiToken: "", dataset: "" },
  },
}));
