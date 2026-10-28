import {
  AccountCreationRequestSchema,
  AccountType,
  OrganizationCreationRequestSchema,
  ServiceAccountCreationRequestSchema,
} from "./account";

const request = (account_id: string) => ({
  account_id,
  type: AccountType.INDIVIDUAL,
  name: "Some Name",
});

describe("reserved account IDs", () => {
  it.each(["products", "admin", "api", "tags", "source"])(
    "refuses %s",
    (id) => {
      const result = AccountCreationRequestSchema.safeParse(request(id));
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toBe(
        "That account ID is reserved"
      );
    }
  );

  it("refuses a reserved ID whatever its case", () => {
    expect(AccountCreationRequestSchema.safeParse(request("Products")).success).toBe(false);
  });

  it("refuses a reserved ID for an organization", () => {
    expect(
      OrganizationCreationRequestSchema.safeParse({
        ...request("products"),
        type: AccountType.ORGANIZATION,
        owner_account_id: "acoltrane",
      }).success
    ).toBe(false);
  });

  it("allows an ID that only contains a reserved word", () => {
    expect(AccountCreationRequestSchema.safeParse(request("my-products")).success).toBe(true);
  });

  it("leaves a service account's own id alone, since its owner's id namespaces it", () => {
    expect(
      ServiceAccountCreationRequestSchema.safeParse({
        name: "Nightly sync",
        local_id: "admin",
        owner_account_id: "acoltrane",
      }).success
    ).toBe(true);
  });
});
