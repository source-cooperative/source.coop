/** @jest-environment node */
import { NextRequest } from "next/server";
import { membershipsTable } from "@/lib/clients/database";
import { getApiSession } from "@/lib/api/utils";
import { isAuthorized } from "@/lib/api/authz";
import { MembershipRole, MembershipState } from "@/types";

// accountsTable.fetchById resolves to nothing, so the service-account grant
// check has no member to judge and these tests exercise role validation alone.
jest.mock("@/lib/clients/database", () => ({
  membershipsTable: { fetchById: jest.fn(), update: jest.fn() },
  accountsTable: { fetchById: jest.fn() },
}));
jest.mock("@/lib/api/utils", () => ({ getApiSession: jest.fn() }));
jest.mock("@/lib/api/authz", () => ({ isAuthorized: jest.fn() }));

const { PUT } = require("./route");

const membership = {
  membership_id: "m1",
  account_id: "someone",
  membership_account_id: "acme",
  role: MembershipRole.ReadData,
  state: MembershipState.Member,
};
const params = { params: { membership_id: "m1" } };
const put = (role: string) =>
  new NextRequest("http://localhost/api/v1/memberships/m1/update-role", {
    method: "PUT",
    body: JSON.stringify({ role }),
  });

describe("PUT /api/v1/memberships/[membership_id]/update-role", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (getApiSession as jest.Mock).mockResolvedValue({});
    (membershipsTable.fetchById as jest.Mock).mockResolvedValue(membership);
    (membershipsTable.update as jest.Mock).mockImplementation(async (m) => m);
    (isAuthorized as jest.Mock).mockReturnValue(true);
  });

  test("accepts every membership role", async () => {
    for (const role of Object.values(MembershipRole)) {
      const res = await PUT(put(role), params);
      expect(res.status).toBe(200);
      await expect(res.json()).resolves.toMatchObject({ role });
    }
  });

  test("rejects a role that does not exist", async () => {
    expect((await PUT(put("members"), params)).status).toBe(400);
    expect((await PUT(put("admin"), params)).status).toBe(400);
    expect(membershipsTable.update).not.toHaveBeenCalled();
  });
});
