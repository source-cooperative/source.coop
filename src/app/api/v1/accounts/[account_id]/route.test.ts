/** @jest-environment node */
import { NextRequest } from "next/server";
import { accountsTable } from "@/lib/clients/database";
import { getApiSession } from "@/lib/api/utils";
import { isAuthorized } from "@/lib/api/authz";

jest.mock("@/lib/clients/database", () => ({
  accountsTable: { fetchById: jest.fn() },
}));
jest.mock("@/lib/api/utils", () => ({ getApiSession: jest.fn() }));
jest.mock("@/lib/api/authz", () => ({ isAuthorized: jest.fn() }));

const { GET } = require("./route");

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
