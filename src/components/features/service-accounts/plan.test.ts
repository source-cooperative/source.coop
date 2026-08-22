import {
  planChanges,
  validate,
  githubSubject,
  serviceAccountId,
  type ServiceAccountFormValues,
} from "./plan";

const base: ServiceAccountFormValues = {
  name: "nightly-sync",
  ownerAccountId: "noaa",
  signInMethods: [
    { kind: "github", repository: "myorg/myrepo", ref: "refs/heads/main" },
  ],
  accessScope: "subset",
  allPermission: "read",
  productGrants: [{ product_id: "buoys", permission: "write" }],
  allowedRoles: ["full_access", "read_only"],
};

describe("service account planner", () => {
  it("namespaces the id so it can't collide with a human account", () => {
    // ID_REGEX forbids `--` in human ids, which is what makes the prefix safe.
    expect(serviceAccountId("nightly-sync")).toBe("svc--nightly-sync");
  });

  it("builds a GitHub subject matching the OIDC `sub` claim", () => {
    expect(githubSubject("myorg/myrepo", "refs/heads/main")).toBe(
      "repo:myorg/myrepo:ref:refs/heads/main"
    );
  });

  it("writes one membership per product for a subset grant", () => {
    const memberships = planChanges(base).tables.find(
      (t) => t.table === "memberships"
    )!;
    expect(memberships.rows).toHaveLength(1);
    expect(memberships.rows[0].fields.repository_id).toBe("buoys");
    expect(memberships.rows[0].fields.role).toBe("write_data");
  });

  it("collapses account-wide access to a single membership with no product", () => {
    const plan = planChanges({
      ...base,
      accessScope: "all",
      allPermission: "write",
    });
    const memberships = plan.tables.find((t) => t.table === "memberships")!;
    expect(memberships.rows).toHaveLength(1);
    expect(memberships.rows[0].fields.repository_id).toContain("none");
  });

  it("writes one identity binding per sign-in method", () => {
    const plan = planChanges({
      ...base,
      signInMethods: [
        { kind: "github", repository: "myorg/myrepo", ref: "refs/heads/main" },
        { kind: "api_key", expiresInDays: 90 },
      ],
    });
    const bindings = plan.tables.find((t) => t.table === "identity_bindings")!;
    expect(bindings.rows).toHaveLength(2);
    // Both point at the same principal — access does not vary by sign-in route.
    expect(new Set(bindings.rows.map((r) => r.fields.service_account_id)).size).toBe(1);
  });

  it("uses the read-only role in workload config when full access is unticked", () => {
    const plan = planChanges({ ...base, allowedRoles: ["read_only"] });
    expect(plan.workloadConfig[0].lines.join("\n")).toContain("role/read-only");
  });

  it("rejects an empty role set, which would leave the account unable to authenticate", () => {
    expect(validate({ ...base, allowedRoles: [] })).toContainEqual(
      expect.stringContaining("Tick at least one role")
    );
  });

  it("rejects a name containing a double hyphen so it can't forge the reserved prefix", () => {
    expect(validate({ ...base, name: "evil--thing" }).length).toBeGreaterThan(0);
  });

  it("rejects a malformed GitHub repository", () => {
    expect(
      validate({
        ...base,
        signInMethods: [{ kind: "github", repository: "notarepo", ref: "refs/heads/main" }],
      })
    ).toContainEqual(expect.stringContaining("owner/repo"));
  });

  it("accepts a well-formed submission", () => {
    expect(validate(base)).toEqual([]);
  });
});
