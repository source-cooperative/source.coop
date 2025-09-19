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
      stage: "test",
    },
    auth: {
      accessToken: "test-token",
    },
    apiSecret: "test-source-key-123",
  },
}));
