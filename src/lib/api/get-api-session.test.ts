/** @jest-environment node */
import { NextRequest } from "next/server";
import { authenticateWithOidcToken } from "@/lib/api/oidc";
import { getApiSession } from "@/lib/api/utils";

jest.mock("@/lib/api/oidc", () => ({ authenticateWithOidcToken: jest.fn() }));
jest.mock("@ory/nextjs/app", () => ({ getServerSession: jest.fn() }));
jest.mock("@/lib/ory", () => ({ getOryId: jest.fn() }));
jest.mock("@/lib/clients/database", () => ({}));

const SESSION = { account: { account_id: "someone" } };
const request = (method: string) =>
  new NextRequest("http://localhost/api/v1/products/someone", {
    method,
    headers: { Authorization: "Bearer proxy-assertion" },
  });

describe("getApiSession with a proxy assertion", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (authenticateWithOidcToken as jest.Mock).mockResolvedValue(SESSION);
  });

  test.each(["GET", "HEAD"])("reads with it on %s", async (method) => {
    await expect(getApiSession(request(method))).resolves.toBe(SESSION);
  });

  test.each(["POST", "PUT", "PATCH", "DELETE"])(
    "never writes with it on %s, nor falls back to the cookie",
    async (method) => {
      await expect(getApiSession(request(method))).resolves.toBeNull();
      expect(authenticateWithOidcToken).not.toHaveBeenCalled();
    }
  );
});
