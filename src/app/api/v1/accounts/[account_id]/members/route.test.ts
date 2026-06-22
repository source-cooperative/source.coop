/** @jest-environment node */
import { NextRequest } from "next/server";
import { accountsTable, membershipsTable } from "@/lib/clients/database";
import { getApiSession } from "@/lib/api/utils";
import { isAuthorized } from "@/lib/api/authz";
import { AccountType } from "@/types/account";
import { MembershipRole } from "@/types";
import { POST } from "./route";

jest.mock("@/lib/clients/database", () => ({
  accountsTable: { fetchById: jest.fn() },
  membershipsTable: { create: jest.fn(), listByAccount: jest.fn() },
}));
jest.mock("@/lib/api/utils", () => ({ getApiSession: jest.fn() }));
jest.mock("@/lib/api/authz", () => ({ isAuthorized: jest.fn() }));

describe("POST /api/v1/accounts/[account_id]/members", () => {
  afterEach(() => jest.resetAllMocks());

  const validBody = { account_id: "invitee", role: MembershipRole.ReadData };

  // Regression: a successful invite must return 200 with the created membership.
  // The handler previously gated its only return on a `const success = false`,
  // so a successful POST created the membership then fell through to undefined.
  test("returns 200 and created membership on success", async () => {
    (getApiSession as jest.Mock).mockResolvedValue({});
    (accountsTable.fetchById as jest.Mock).mockResolvedValue({
      account_id: "org",
      type: AccountType.INDIVIDUAL,
    });
    (isAuthorized as jest.Mock).mockReturnValue(true);
    (membershipsTable.listByAccount as jest.Mock).mockResolvedValue([]);
    (membershipsTable.create as jest.Mock).mockImplementation((m) =>
      Promise.resolve(m)
    );

    const req = {
      json: () => Promise.resolve(validBody),
    } as unknown as NextRequest;
    const res = await POST(req, { params: Promise.resolve({ account_id: "org" }) });

    expect(res?.status).toBe(200);
    await expect(res?.json()).resolves.toMatchObject({
      account_id: "invitee",
      membership_account_id: "org",
      state: "invited",
    });
  });
});
