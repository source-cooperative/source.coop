import { Membership, MembershipRole, MembershipState } from "@/types";
import { fromItem, toItem } from "./memberships";

const membership = (overrides: Partial<Membership> = {}): Membership => ({
  membership_id: "m-1",
  account_id: "a-person",
  membership_account_id: "an-org",
  role: MembershipRole.ReadData,
  state: MembershipState.Member,
  state_changed: "2024-01-01T00:00:00.000Z",
  ...overrides,
});

describe("membership items", () => {
  it("stores product_id as repository_id, and reads it back", () => {
    const item = toItem(membership({ product_id: "a-product" }));
    expect(item).toMatchObject({ repository_id: "a-product" });
    expect(item).not.toHaveProperty("product_id");
    expect(fromItem(item)).toEqual(membership({ product_id: "a-product" }));
  });

  it("stores no repository_id for an account's own membership", () => {
    expect(toItem(membership())).not.toHaveProperty("repository_id");
    expect(toItem(membership({ product_id: "" }))).not.toHaveProperty("repository_id");
    expect(fromItem(toItem(membership()))).toEqual(membership());
  });
});
