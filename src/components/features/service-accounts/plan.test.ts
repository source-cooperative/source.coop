import {
  planChanges,
  planDelete,
  planDisable,
  validate,
  githubSubject,
  sanitizeName,
  serviceAccountId,
  type ServiceAccountFormValues,
} from "./plan";

const base: ServiceAccountFormValues = {
  name: "Nightly Sync",
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
  it("derives the stored id from the name a human typed", () => {
    // ID_REGEX forbids `--` in human ids, which is what makes the prefix safe.
    expect(serviceAccountId("Nightly Sync")).toBe("svc--nightly-sync");
  });

  it("sanitizes punctuation, casing and spacing out of the name", () => {
    expect(sanitizeName("  NOAA's Buoy Uploader! ")).toBe("noaa-s-buoy-uploader");
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

  it("collapses a double hyphen so a name cannot forge a second reserved prefix", () => {
    expect(serviceAccountId("evil--thing")).toBe("svc--evil-thing");
  });

  it("rejects a name with nothing to build an id from", () => {
    expect(validate({ ...base, name: "!!!" })).toContainEqual(
      expect.stringContaining("nothing to build an id from")
    );
  });

  it("records a key with no expiry as never expiring", () => {
    const plan = planChanges({
      ...base,
      signInMethods: [{ kind: "api_key", expiresInDays: null }],
    });
    const bindings = plan.tables.find((t) => t.table === "identity_bindings")!;
    expect(bindings.rows[0].fields.key_expires_at).toBe("never");
    // A non-expiring key is a departure from the epic, so it must be surfaced.
    expect(plan.caveats.join(" ")).toContain("no expiry");
  });

  it("uses the official AWS action for the GitHub workflow", () => {
    const yaml = planChanges(base).workloadConfig[0];
    expect(yaml.language).toBe("yaml");
    expect(yaml.lines.join("\n")).toContain(
      "aws-actions/configure-aws-credentials@v4"
    );
    expect(yaml.lines.join("\n")).toContain("id-token: write");
    // A Source-specific audience is what stops an AWS-bound token being
    // replayed here, so it must never be omitted from the example.
    expect(yaml.lines.join("\n")).toContain("audience: data.source.coop");
  });

  it("configures endpoints by environment variable, not a per-command flag", () => {
    for (const block of planChanges({
      ...base,
      signInMethods: [
        { kind: "github", repository: "myorg/myrepo", ref: "refs/heads/main" },
        { kind: "api_key", expiresInDays: 90 },
      ],
    }).workloadConfig) {
      const script = block.lines.join("\n");
      expect(script).toContain("AWS_ENDPOINT_URL_S3");
      expect(script).not.toContain("--endpoint-url");
    }
  });

  it("has the CLI write the token to stdout rather than pick a path", () => {
    const plan = planChanges({
      ...base,
      signInMethods: [{ kind: "api_key", expiresInDays: 90 }],
    });
    const script = plan.workloadConfig[0].lines.join("\n");
    // The redirect is what chooses the location — the CLI assumes nothing.
    expect(script).toContain("source-coop token > ");
    expect(script).toContain("AWS_WEB_IDENTITY_TOKEN_FILE=");
    // And the key itself lives in the keychain, not an env var or dotfile.
    expect(script).toContain("keychain");
    expect(script).not.toContain("export SOURCE_API_KEY");
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

  it("disabling touches only the account row and keeps grants intact", () => {
    const plan = planDisable(base, true);
    expect(plan.changes).toHaveLength(1);
    expect(plan.changes[0]).toMatchObject({
      table: "accounts",
      operation: "update",
    });
    expect(plan.effects.join(" ")).toContain("re-enabling");
  });

  it("deleting removes grants and bindings as well as the account", () => {
    const plan = planDelete({
      ...base,
      signInMethods: [
        { kind: "github", repository: "myorg/myrepo", ref: "refs/heads/main" },
        { kind: "api_key", expiresInDays: 90 },
      ],
    });
    expect(plan.changes.map((c) => c.table)).toEqual([
      "memberships",
      "identity_bindings",
      "accounts",
    ]);
    expect(plan.changes.every((c) => c.operation === "delete")).toBe(true);
    expect(plan.changes[1].detail).toContain("2 rows");
    // The honest part: deletion does not recall live credentials.
    expect(plan.effects.join(" ")).toContain("up to an hour");
  });
});
