import { invitationLink } from "../accountMenu";

describe("invitationLink", () => {
  it("routes an org invite to the org page, using the org name", () => {
    expect(
      invitationLink(
        { membership_account_id: "acme", repository_id: undefined },
        { organizationName: "Acme Corp" }
      )
    ).toEqual({ href: "/acme", label: "Acme Corp" });
  });

  it("routes a product invite to the product page, using the product title", () => {
    expect(
      invitationLink(
        { membership_account_id: "acme", repository_id: "roads" },
        { productTitle: "Road Network" }
      )
    ).toEqual({ href: "/acme/roads", label: "Road Network" });
  });

  it("falls back to ids when names are missing", () => {
    expect(
      invitationLink({ membership_account_id: "acme", repository_id: undefined }, {})
    ).toEqual({ href: "/acme", label: "acme" });
    expect(
      invitationLink({ membership_account_id: "acme", repository_id: "roads" }, {})
    ).toEqual({ href: "/acme/roads", label: "acme/roads" });
  });
});
