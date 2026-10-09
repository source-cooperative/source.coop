/** @jest-environment node */
import { NextRequest } from "next/server";
import { getApiSession } from "@/lib/api/utils";
import { inviteMember } from "@/lib/operations/memberships";
import { ok } from "@/lib/operations/result";
import { POST } from "./route";

jest.mock("@/lib/api/utils", () => ({ getApiSession: jest.fn() }));
jest.mock("@/lib/operations/memberships");

describe("POST /api/v1/accounts/[account_id]/members", () => {
  it("invites to the account in the path, never to a product named in the body", async () => {
    const session = { identity_id: "id" };
    (getApiSession as jest.Mock).mockResolvedValue(session);
    (inviteMember as jest.Mock).mockResolvedValue(ok({ membership_id: "m-1" }));

    const res = await POST(
      new NextRequest("http://localhost/api/v1/accounts/org/members", {
        method: "POST",
        headers: { Authorization: "Bearer t" },
        body: JSON.stringify({
          account_id: "invitee",
          role: "read_data",
          membership_account_id: "elsewhere",
          repository_id: "a-product",
        }),
      }),
      { params: Promise.resolve({ account_id: "org" }) }
    );

    expect(res.status).toBe(201);
    expect(inviteMember).toHaveBeenCalledWith(session, {
      account_id: "invitee",
      role: "read_data",
      membership_account_id: "org",
      repository_id: undefined,
    });
  });
});
