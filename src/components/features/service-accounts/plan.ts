/**
 * Pure planner for the service-account mock: turns the form's answers into the
 * database rows that creating the account *would* write.
 *
 * This exists so the mock demonstrates the data model rather than just a form.
 * Nothing here touches a database — see `ServiceAccountForm`, which renders the
 * output. Keep it pure so it stays testable (`plan.test.ts`).
 *
 * Model per source-cooperative/source.coop#491:
 *   accounts           — the principal (existing table, new `service` type)
 *   identity_bindings  — how it may sign in, one row per method (NEW table)
 *   memberships        — what it may reach, one row per grant (existing table)
 */

/** Roles are masks: they narrow a service account's grants, never widen them. */
export const ROLES = {
  full_access: {
    label: "Full access",
    description: "Everything this account's grants allow.",
  },
  read_only: {
    label: "Read only",
    description: "The same grants, with writing removed.",
  },
} as const;

export type RoleId = keyof typeof ROLES;

export const ROLES_ORDER: RoleId[] = ["full_access", "read_only"];

export type SignInMethod =
  | { kind: "github"; repository: string; ref: string }
  | { kind: "api_key"; expiresInDays: number | null };

export type ProductGrant = { product_id: string; permission: "read" | "write" };

export interface ServiceAccountFormValues {
  name: string;
  ownerAccountId: string;
  signInMethods: SignInMethod[];
  /** "all" grants across the whole owner account; "subset" grants per product. */
  accessScope: "all" | "subset";
  allPermission: "read" | "write";
  productGrants: ProductGrant[];
  allowedRoles: RoleId[];
}

export interface PlannedRow {
  /** Column → value, rendered as a table. */
  fields: Record<string, string>;
  /** Why this row exists, in plain language. */
  note?: string;
}

export interface PlannedTable {
  table: string;
  status: "existing table" | "new table";
  rows: PlannedRow[];
  /** What this table answers, in plain language. */
  purpose: string;
}

export interface Plan {
  serviceAccountId: string;
  tables: PlannedTable[];
  /** Environment variables the workload would use, per sign-in method. */
  workloadConfig: { title: string; language: string; lines: string[] }[];
  /** Things the mock deliberately does not do. */
  caveats: string[];
}

/**
 * Service-account ids live in a reserved namespace. `ID_REGEX` forbids a double
 * hyphen anywhere in a human-chosen id, so `svc--` cannot collide with one.
 */
export const SERVICE_ID_PREFIX = "svc--";

/**
 * Derive the stored id from the name a human typed. `ID_REGEX` allows only
 * lowercase alphanumerics and single hyphens, so anything else collapses to a
 * hyphen and the result is trimmed of leading/trailing ones.
 */
export function sanitizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function serviceAccountId(name: string): string {
  return `${SERVICE_ID_PREFIX}${sanitizeName(name)}`;
}

/** GitHub's `sub` claim for a workflow running on a branch ref. */
export function githubSubject(repository: string, ref: string): string {
  return `repo:${repository}:ref:${ref}`;
}

export const GITHUB_ISSUER = "https://token.actions.githubusercontent.com";
export const SOURCE_ISSUER = "https://auth.source.coop";

export function validate(values: ServiceAccountFormValues): string[] {
  const errors: string[] = [];

  const derived = sanitizeName(values.name);
  if (!values.name.trim()) {
    errors.push("Give the service account a name.");
  } else if (!derived) {
    errors.push(
      "That name has no letters or numbers in it, so there's nothing to build an id from."
    );
  }

  if (values.signInMethods.length === 0) {
    errors.push("Add at least one way for software to sign in as this account.");
  }

  values.signInMethods.forEach((method, i) => {
    if (method.kind === "github") {
      if (!/^[^/\s]+\/[^/\s]+$/.test(method.repository)) {
        errors.push(`Sign-in method ${i + 1}: repository must look like owner/repo.`);
      }
      if (!method.ref.trim()) {
        errors.push(`Sign-in method ${i + 1}: give a git ref.`);
      }
    }
  });

  if (values.accessScope === "subset" && values.productGrants.length === 0) {
    errors.push("Pick at least one product, or grant access to the whole account.");
  }

  // Nothing ticked means the account can never obtain credentials at all.
  if (values.allowedRoles.length === 0) {
    errors.push("Tick at least one role, or this account can never get credentials.");
  }

  return errors;
}

export function planChanges(values: ServiceAccountFormValues): Plan {
  const id = serviceAccountId(values.name);

  const accountRow: PlannedRow = {
    fields: {
      account_id: id,
      type: "service",
      owner_account_id: values.ownerAccountId,
      allowed_roles: values.allowedRoles.join(", "),
      disabled: "false",
    },
    note: "A new account type. Its permissions are additionally capped by whatever the owner can currently do.",
  };

  const bindingRows: PlannedRow[] = values.signInMethods.map((method): PlannedRow =>
    method.kind === "github"
      ? {
          fields: {
            service_account_id: id,
            issuer: GITHUB_ISSUER,
            subject: githubSubject(method.repository, method.ref),
          },
          note: "GitHub vouches for the workflow. No secret is stored anywhere.",
        }
      : {
          fields: {
            service_account_id: id,
            issuer: SOURCE_ISSUER,
            subject: "talos:<actor_id assigned when the key is issued>",
            key_expires_at:
              method.expiresInDays === null
                ? "never"
                : `+${method.expiresInDays} days`,
          },
          note: "The key itself is stored hashed by the key service and shown to you once.",
        }
  );

  const membershipRows: PlannedRow[] =
    values.accessScope === "all"
      ? [
          {
            fields: {
              account_id: id,
              membership_account_id: values.ownerAccountId,
              repository_id: "(none — applies to every product)",
              role: values.allPermission === "write" ? "write_data" : "read_data",
              state: "member",
            },
            note: "A membership with no product attached already means account-wide in the existing model.",
          },
        ]
      : values.productGrants.map((grant) => ({
          fields: {
            account_id: id,
            membership_account_id: values.ownerAccountId,
            repository_id: grant.product_id,
            role: grant.permission === "write" ? "write_data" : "read_data",
            state: "member",
          },
        }));

  const roleArn = values.allowedRoles.includes("full_access")
    ? "arn:aws:iam::000000000000:role/full-access"
    : "arn:aws:iam::000000000000:role/read-only";

  const bucketExample =
    values.accessScope === "all"
      ? `${values.ownerAccountId}:<product>`
      : `${values.ownerAccountId}:${values.productGrants[0]?.product_id ?? "<product>"}`;

  const workloadConfig = values.signInMethods.map((method) =>
    method.kind === "github"
      ? {
          title: `GitHub Actions — ${method.repository} @ ${method.ref}`,
          language: "yaml",
          lines: [
            "permissions:",
            "  id-token: write",
            "  contents: read",
            "",
            "env:",
            "  AWS_ENDPOINT_URL_STS: https://data.source.coop/.sts",
            "",
            "steps:",
            "  - uses: aws-actions/configure-aws-credentials@v4",
            "    with:",
            `      role-to-assume: ${roleArn}`,
            "      aws-region: us-west-2",
            "      audience: source-cooperative",
            "",
            "  - name: Publish",
            `    run: aws s3 sync ./out s3://${bucketExample}/ \\`,
            "      --endpoint-url https://data.source.coop",
          ],
        }
      : {
          title: "API key, exchanged by the Source CLI",
          language: "bash",
          lines: [
            "# Store the key once in the OS keychain — Keychain on macOS, Secret",
            "# Service on Linux, Credential Manager on Windows. The CLI reads it",
            "# from there, so it never lands in a dotfile or an env var.",
            "source-coop auth login --service-account",
            "",
            "# Exchange it for a short-lived identity token. The CLI writes the",
            "# token to stdout, so you decide where it lives.",
            "source-coop token > ~/.source/token",
            "",
            `export AWS_ROLE_ARN=${roleArn}`,
            "export AWS_WEB_IDENTITY_TOKEN_FILE=~/.source/token",
            "export AWS_ENDPOINT_URL_STS=https://data.source.coop/.sts",
            "",
            `aws s3 sync ./out s3://${bucketExample}/ \\`,
            "  --endpoint-url https://data.source.coop",
            "",
            "# The token is short-lived. Re-run the exchange on a timer before",
            "# it expires — the AWS SDK re-reads the file, so nothing restarts.",
          ],
        }
  );

  const caveats = [
    "Nothing was saved. This form is a design mock for #491 and writes no rows.",
    "`identity_bindings` does not exist yet, and `accounts` has no `service` type or `owner_account_id` column.",
    "Roles only ever subtract. A role can never turn a read grant into a write grant.",
    "Revoking a grant stops new access in about a minute; credentials already issued last up to an hour.",
    "aws-actions/configure-aws-credentials also calls GetCallerIdentity, which /.sts does not implement yet — tracked as its own item in #491.",
  ];

  if (values.signInMethods.some((m) => m.kind === "api_key" && m.expiresInDays === null)) {
    caveats.push(
      "A key with no expiry is only as revocable as the revoke button — #491 currently proposes that every key must expire, so this option is a deliberate departure worth deciding on."
    );
  }

  if (values.allowedRoles.length === ROLES_ORDER.length) {
    caveats.push(
      "Both roles are ticked, so the role restriction is a no-op here — it only bites once you untick Full access."
    );
  }

  return {
    serviceAccountId: id,
    tables: [
      {
        table: "accounts",
        status: "existing table",
        purpose: "Who is this?",
        rows: [accountRow],
      },
      {
        table: "identity_bindings",
        status: "new table",
        purpose: "How does it prove that?",
        rows: bindingRows,
      },
      {
        table: "memberships",
        status: "existing table",
        purpose: "What may it touch?",
        rows: membershipRows,
      },
    ],
    workloadConfig,
    caveats,
  };
}

/** A row-level change from disabling or deleting an existing service account. */
export interface LifecycleChange {
  table: string;
  operation: "update" | "delete";
  detail: string;
}

export interface LifecyclePlan {
  changes: LifecycleChange[];
  /** What actually stops, and when. */
  effects: string[];
}

function grantCount(values: ServiceAccountFormValues): number {
  return values.accessScope === "all" ? 1 : values.productGrants.length;
}

export function planDisable(
  values: ServiceAccountFormValues,
  nextDisabled: boolean
): LifecyclePlan {
  return {
    changes: [
      {
        table: "accounts",
        operation: "update",
        detail: `${serviceAccountId(values.name)} — disabled = ${nextDisabled}`,
      },
    ],
    effects: nextDisabled
      ? [
          "Every sign-in method stops working; no new credentials are issued.",
          "Grants and sign-in methods are left in place, so re-enabling restores exactly what was there.",
          "Credentials already issued keep working until they expire — up to an hour.",
        ]
      : [
          "Sign-in methods work again immediately, with the grants that were already recorded.",
        ],
  };
}

export function planDelete(values: ServiceAccountFormValues): LifecyclePlan {
  const grants = grantCount(values);
  return {
    changes: [
      {
        table: "memberships",
        operation: "delete",
        detail: `${grants} row${grants === 1 ? "" : "s"} — every grant this account held`,
      },
      {
        table: "identity_bindings",
        operation: "delete",
        detail: `${values.signInMethods.length} row${
          values.signInMethods.length === 1 ? "" : "s"
        } — every way it could sign in`,
      },
      {
        table: "accounts",
        operation: "delete",
        detail: serviceAccountId(values.name),
      },
    ],
    effects: [
      "Permanent. Nothing here can be restored, and the id is not reusable.",
      "Credentials already issued keep working until they expire — up to an hour. Disabling first, then deleting once that window has passed, closes it.",
      "Any API key issued to this account is revoked along with its binding.",
    ],
  };
}
