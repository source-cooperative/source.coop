import { revalidatePath } from "next/cache";
import { Membership, MembershipRole, MembershipState } from "@/types";
import { getPageSession } from "../api/utils";
import * as ops from "../operations/memberships";
import { forbidden, ok } from "../operations/result";
import {
  acceptInvitation,
  getPendingInvitation,
  inviteMember,
  revokeMembership,
} from "./memberships";

jest.mock("../api/utils", () => ({ getPageSession: jest.fn() }));
jest.mock("../operations/memberships");
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

const operations = ops as jest.Mocked<typeof ops>;
const session = { identity_id: "id" };

const membership = (overrides: Partial<Membership> = {}): Membership => ({
  membership_id: "m-1",
  account_id: "a-person",
  membership_account_id: "an-org",
  role: MembershipRole.ReadData,
  state: MembershipState.Invited,
  state_changed: "2024-01-01T00:00:00.000Z",
  ...overrides,
});

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) data.set(k, v);
  return data;
};

beforeEach(() => {
  jest.resetAllMocks();
  (getPageSession as jest.Mock).mockResolvedValue(session);
});

describe("inviteMember", () => {
  it("passes the form's fields to the operation, and an empty product as none", async () => {
    operations.inviteMember.mockResolvedValue(ok(membership()));
    const data = form({
      organization_id: "an-org",
      product_id: "",
      account_id: "a-person",
      role: "read_data",
    });
    const state = await inviteMember({} as never, data);
    expect(operations.inviteMember).toHaveBeenCalledWith(session, {
      membership_account_id: "an-org",
      repository_id: undefined,
      account_id: "a-person",
      role: "read_data",
    });
    expect(state).toMatchObject({ success: true, data });
    expect(revalidatePath).toHaveBeenCalledWith(expect.stringContaining("an-org"));
  });

  it("shows the operation's refusal, and revalidates nothing", async () => {
    operations.inviteMember.mockResolvedValue(forbidden("No"));
    const state = await inviteMember({} as never, form({}));
    expect(state).toMatchObject({ success: false, message: "No" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

it("revokeMembership revokes the form's membership", async () => {
  operations.revokeMembership.mockResolvedValue(ok(membership()));
  await revokeMembership({} as never, form({ membership_id: "m-1" }));
  expect(operations.revokeMembership).toHaveBeenCalledWith(session, "m-1");
});

it("acceptInvitation reports success or the refusal", async () => {
  operations.acceptInvitation.mockResolvedValue(ok(membership()));
  expect(await acceptInvitation("m-1")).toEqual({ success: true });
  operations.acceptInvitation.mockResolvedValue(forbidden("No"));
  expect(await acceptInvitation("m-1")).toEqual({ success: false, error: "No" });
});

describe("getPendingInvitation", () => {
  const toOrg = membership();
  const toProduct = membership({ membership_id: "m-2", repository_id: "a-product" });

  beforeEach(() => operations.listMemberships.mockResolvedValue(ok([toOrg, toProduct])));

  it("finds the invitation to an account, or to one of its products", async () => {
    expect(await getPendingInvitation("an-org")).toBe(toOrg);
    expect(await getPendingInvitation("an-org", "a-product")).toBe(toProduct);
    expect(await getPendingInvitation("other-org")).toBeNull();
    expect(operations.listMemberships).toHaveBeenCalledWith(session, {
      state: MembershipState.Invited,
    });
  });

  it("is null when the operation refuses or fails", async () => {
    operations.listMemberships.mockResolvedValue(forbidden("No"));
    expect(await getPendingInvitation("an-org")).toBeNull();
    operations.listMemberships.mockRejectedValue(new Error("DynamoDB down"));
    expect(await getPendingInvitation("an-org")).toBeNull();
  });
});
