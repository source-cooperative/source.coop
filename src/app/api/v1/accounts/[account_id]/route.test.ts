/** @jest-environment node */
import { NextRequest } from "next/server";
import { accountsTable } from "@/lib/clients/database";
import { getApiSession } from "@/lib/api/utils";
import { isAuthorized } from "@/lib/api/authz";
import { ok } from "@/lib/operations/result";
import { deleteServiceAccount } from "@/lib/operations/service-accounts";
import { AccountType } from "@/types";

jest.mock("@/lib/clients/database", () => ({
  accountsTable: { fetchById: jest.fn(), update: jest.fn() },
}));
jest.mock("@/lib/operations/service-accounts");
jest.mock("@/lib/api/utils", () => ({ getApiSession: jest.fn() }));
jest.mock("@/lib/api/authz", () => ({ isAuthorized: jest.fn() }));

const { GET, DELETE } = require("./route");

describe("GET /api/v1/accounts/[account_id]", () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test("returns 404 when account not found", async () => {
    (getApiSession as jest.Mock).mockResolvedValue({});
    (accountsTable.fetchById as jest.Mock).mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/v1/accounts/foo");
    const res = await GET(req, { params: { account_id: "foo" } });
    expect(res.status).toBe(404);
  });

  test("returns 200 when authorized", async () => {
    const account = { account_id: "foo" };
    (getApiSession as jest.Mock).mockResolvedValue({});
    (accountsTable.fetchById as jest.Mock).mockResolvedValue(account);
    (isAuthorized as jest.Mock).mockReturnValue(true);
    const req = new NextRequest("http://localhost/api/v1/accounts/foo");
    const res = await GET(req, { params: { account_id: "foo" } });
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual(account);
  });
});

describe("DELETE /api/v1/accounts/[account_id]", () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  const del = (account_id: string) =>
    DELETE(
      new NextRequest(`http://localhost/api/v1/accounts/${account_id}`, {
        method: "DELETE",
        headers: { Authorization: "Bearer t" },
      }),
      { params: Promise.resolve({ account_id }) }
    );

  test("deletes a service account", async () => {
    const bot = { account_id: "acme--sync", type: AccountType.SERVICE };
    (accountsTable.fetchById as jest.Mock).mockResolvedValue(bot);
    (deleteServiceAccount as jest.Mock).mockResolvedValue(ok(bot));
    expect((await del("acme--sync")).status).toBe(200);
    expect(deleteServiceAccount).toHaveBeenCalled();
    expect(accountsTable.update).not.toHaveBeenCalled();
  });

  test("disables any other account, if the caller may", async () => {
    const org = { account_id: "acme", type: AccountType.ORGANIZATION, disabled: false };
    (getApiSession as jest.Mock).mockResolvedValue({ identity_id: "id" });
    (accountsTable.fetchById as jest.Mock).mockResolvedValue(org);
    (accountsTable.update as jest.Mock).mockImplementation(async (a) => a);
    (isAuthorized as jest.Mock).mockReturnValue(false);
    expect((await del("acme")).status).toBe(403);
    (isAuthorized as jest.Mock).mockReturnValue(true);
    const res = await del("acme");
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ disabled: true });
    expect(deleteServiceAccount).not.toHaveBeenCalled();
  });
});
