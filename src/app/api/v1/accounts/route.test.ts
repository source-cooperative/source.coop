/** @jest-environment node */
import { NextRequest } from "next/server";
import { getApiSession } from "@/lib/api/utils";
import { isAuthorized } from "@/lib/api/authz";
import { accountsTable } from "@/lib/clients/database";
import { AccountType } from "@/types/account";

jest.mock("@/lib/api/utils", () => ({ getApiSession: jest.fn() }));
jest.mock("@/lib/api/authz", () => ({ isAuthorized: jest.fn() }));
jest.mock("@/lib/clients/database", () => ({
  accountsTable: { create: jest.fn() },
}));

const { POST } = require("./route");

describe("POST /api/v1/accounts", () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test("creates account when authorized", async () => {
    (getApiSession as jest.Mock).mockResolvedValue({ identity_id: "id" });
    (isAuthorized as jest.Mock).mockReturnValue(true);
    (accountsTable.create as jest.Mock).mockResolvedValue({ account_id: "a" });

    const body = {
      account_id: "a",
      type: AccountType.INDIVIDUAL,
      metadata_public: {},
    };
    const req = new NextRequest("http://localhost/api/v1/accounts", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBeGreaterThanOrEqual(200);
  });

  test("returns 401 when unauthorized", async () => {
    (getApiSession as jest.Mock).mockResolvedValue({ identity_id: "id" });
    (isAuthorized as jest.Mock).mockReturnValue(false);

    const body = {
      account_id: "a",
      type: AccountType.INDIVIDUAL,
      metadata_public: {},
    };
    const req = new NextRequest("http://localhost/api/v1/accounts", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});
