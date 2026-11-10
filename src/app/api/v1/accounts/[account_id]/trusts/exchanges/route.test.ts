/** @jest-environment node */
import { NextRequest } from "next/server";
import { accountTrustsTable } from "@/lib/clients/database";
import { authenticateWithOidcToken } from "@/lib/api/oidc";
import { isAdmin } from "@/lib/api/authz";
import { LOGGER } from "@/lib/logging";

jest.mock("@/lib/clients/database", () => ({
  accountTrustsTable: { isTrusted: jest.fn(), touch: jest.fn() },
}));
// No request scope here for `after` to defer into, so the deferred work runs
// inline.
jest.mock("next/server", () => ({
  ...jest.requireActual("next/server"),
  after: (task: () => unknown) => task(),
}));
jest.mock("@/lib/logging", () => ({ LOGGER: { warn: jest.fn() } }));
jest.mock("@/lib/api/oidc", () => ({ authenticateWithOidcToken: jest.fn() }));
jest.mock("@/lib/api/authz", () => ({ isAdmin: jest.fn() }));

const { POST } = require("./route");

const ISSUER = "https://token.actions.githubusercontent.com";
const SUBJECT = "repo:acme/data:ref:refs/heads/main";
const params = { params: { account_id: "nightly-sync" } };
const post = (body: unknown) =>
  new NextRequest("http://localhost/api/v1/accounts/nightly-sync/trusts/exchanges", {
    method: "POST",
    headers: { "x-vercel-id": "iad1::req-1" },
    body: JSON.stringify(body),
  });

describe("POST /api/v1/accounts/[account_id]/trusts/exchanges", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (authenticateWithOidcToken as jest.Mock).mockResolvedValue({ account: { account_id: "nightly-sync" } });
    (isAdmin as jest.Mock).mockReturnValue(false);
    (accountTrustsTable.isTrusted as jest.Mock).mockResolvedValue(true);
    (accountTrustsTable.touch as jest.Mock).mockResolvedValue(undefined);
  });

  test("answers trusted for a subject the account trusts, as the account itself", async () => {
    const res = await POST(post({ issuer: ISSUER, subject: SUBJECT }), params);
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ trusted: true });
    expect(accountTrustsTable.isTrusted).toHaveBeenCalledWith("nightly-sync", ISSUER, SUBJECT);
    expect(accountTrustsTable.touch).toHaveBeenCalledWith("nightly-sync", ISSUER, SUBJECT);
  });

  test("still answers trusted when recording the use fails", async () => {
    (accountTrustsTable.touch as jest.Mock).mockRejectedValue(new Error("throttled"));
    expect((await POST(post({ issuer: ISSUER, subject: SUBJECT }), params)).status).toBe(200);
    expect(LOGGER.warn).toHaveBeenCalledWith(
      "Could not record trust use",
      expect.objectContaining({ metadata: expect.objectContaining({ error: "throttled" }) })
    );
  });

  test("is 403 for a subject the account does not trust", async () => {
    (accountTrustsTable.isTrusted as jest.Mock).mockResolvedValue(false);
    const res = await POST(post({ issuer: ISSUER, subject: SUBJECT }), params);
    expect(res.status).toBe(403);
    expect(accountTrustsTable.touch).not.toHaveBeenCalled();
    expect(res.headers.get("content-type")).toBe("application/problem+json");
    await expect(res.json()).resolves.toMatchObject({
      type: "http://localhost/api/problems/forbidden",
      status: 403,
      code: "forbidden",
      trusted: false,
      instance: "http://localhost/api/v1/accounts/nightly-sync/trusts/exchanges",
      request_id: "iad1::req-1",
    });
  });

  test("answers an admin asking about any account", async () => {
    (authenticateWithOidcToken as jest.Mock).mockResolvedValue({ account: { account_id: "an-admin" } });
    (isAdmin as jest.Mock).mockReturnValue(true);
    expect((await POST(post({ issuer: ISSUER, subject: SUBJECT }), params)).status).toBe(200);
    expect(accountTrustsTable.isTrusted).toHaveBeenCalledWith("nightly-sync", ISSUER, SUBJECT);
    expect(accountTrustsTable.touch).not.toHaveBeenCalled();
  });

  test("is 401 for any other account, and 400 without an issuer and subject", async () => {
    (authenticateWithOidcToken as jest.Mock).mockResolvedValue({ account: { account_id: "someone-else" } });
    expect((await POST(post({ issuer: ISSUER, subject: SUBJECT }), params)).status).toBe(401);
    expect(accountTrustsTable.isTrusted).not.toHaveBeenCalled();

    (authenticateWithOidcToken as jest.Mock).mockResolvedValue({ account: { account_id: "nightly-sync" } });
    expect((await POST(post({ issuer: ISSUER }), params)).status).toBe(400);
  });
});
