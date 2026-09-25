/** @jest-environment node */
import { NextRequest } from "next/server";
import { accountTrustsTable } from "@/lib/clients/database";
import { getApiSession } from "@/lib/api/utils";
import { isAdmin } from "@/lib/api/authz";

jest.mock("@/lib/clients/database", () => ({
  accountTrustsTable: { isTrusted: jest.fn() },
}));
jest.mock("@/lib/api/utils", () => ({ getApiSession: jest.fn() }));
jest.mock("@/lib/api/authz", () => ({ isAdmin: jest.fn() }));

const { POST } = require("./route");

const ISSUER = "https://token.actions.githubusercontent.com";
const SUBJECT = "repo:acme/data:ref:refs/heads/main";
const params = { params: { account_id: "nightly-sync" } };
const post = (body: unknown) =>
  new NextRequest("http://localhost/api/v1/accounts/nightly-sync/trusts/exchanges", {
    method: "POST",
    body: JSON.stringify(body),
  });

describe("POST /api/v1/accounts/[account_id]/trusts/exchanges", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (getApiSession as jest.Mock).mockResolvedValue({ account: { account_id: "nightly-sync" } });
    (isAdmin as jest.Mock).mockReturnValue(false);
    (accountTrustsTable.isTrusted as jest.Mock).mockResolvedValue(true);
  });

  test("answers trusted for a subject the account trusts, as the account itself", async () => {
    const res = await POST(post({ issuer: ISSUER, subject: SUBJECT }), params);
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ trusted: true });
    expect(accountTrustsTable.isTrusted).toHaveBeenCalledWith("nightly-sync", ISSUER, SUBJECT);
  });

  test("is 403 for a subject the account does not trust", async () => {
    (accountTrustsTable.isTrusted as jest.Mock).mockResolvedValue(false);
    const res = await POST(post({ issuer: ISSUER, subject: SUBJECT }), params);
    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({ trusted: false });
  });

  test("answers an admin asking about any account", async () => {
    (getApiSession as jest.Mock).mockResolvedValue({ account: { account_id: "an-admin" } });
    (isAdmin as jest.Mock).mockReturnValue(true);
    expect((await POST(post({ issuer: ISSUER, subject: SUBJECT }), params)).status).toBe(200);
    expect(accountTrustsTable.isTrusted).toHaveBeenCalledWith("nightly-sync", ISSUER, SUBJECT);
  });

  test("is 401 for any other account, and 400 without an issuer and subject", async () => {
    (getApiSession as jest.Mock).mockResolvedValue({ account: { account_id: "someone-else" } });
    expect((await POST(post({ issuer: ISSUER, subject: SUBJECT }), params)).status).toBe(401);
    expect(accountTrustsTable.isTrusted).not.toHaveBeenCalled();

    (getApiSession as jest.Mock).mockResolvedValue({ account: { account_id: "nightly-sync" } });
    expect((await POST(post({ issuer: ISSUER }), params)).status).toBe(400);
  });
});
