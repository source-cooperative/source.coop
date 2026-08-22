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
  | { kind: "api_key"; expiresInDays: number };

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
  workloadConfig: { title: string; lines: string[] }[];
  /** Things the mock deliberately does not do. */
  caveats: string[];
}

/**
 * Service-account ids live in a reserved namespace. `ID_REGEX` forbids a double
 * hyphen anywhere in a human-chosen id, so `svc--` cannot collide with one.
 */
export const SERVICE_ID_PREFIX = "svc--";

export function serviceAccountId(name: string): string {
  return `${SERVICE_ID_PREFIX}${name}`;
}

/** GitHub's `sub` claim for a workflow running on a branch ref. */
export function githubSubject(repository: string, ref: string): string {
  return `repo:${repository}:ref:${ref}`;
}

export const GITHUB_ISSUER = "https://token.actions.githubusercontent.com";
export const SOURCE_ISSUER = "https://auth.source.coop";

export function validate(values: ServiceAccountFormValues): string[] {
  const errors: string[] = [];

  if (!values.name.trim()) {
    errors.push("Give the service account a name.");
  } else if (!/^[a-z0-9](?:(?!--)[a-z0-9-])*[a-z0-9]$/.test(values.name)) {
    errors.push(
      "Name must be lowercase letters, numbers and single hyphens — no double hyphens, and it can't start or end with one."
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
            key_expires_at: `+${method.expiresInDays} days`,
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

  const workloadConfig = values.signInMethods.map((method) =>
    method.kind === "github"
      ? {
          title: `GitHub Actions — ${method.repository} @ ${method.ref}`,
          lines: [
            "permissions:",
            "  id-token: write",
            "env:",
            `  AWS_ROLE_ARN: ${roleArn}`,
            "  AWS_WEB_IDENTITY_TOKEN_FILE: ${{ runner.temp }}/token",
            "  AWS_ENDPOINT_URL_STS: https://data.source.coop/.sts",
          ],
        }
      : {
          title: "API key, refreshed by the Source CLI",
          lines: [
            "source-coop login --service-account   # writes and refreshes the token file",
            `export AWS_ROLE_ARN=${roleArn}`,
            "export AWS_WEB_IDENTITY_TOKEN_FILE=~/.source/token",
            "export AWS_ENDPOINT_URL_STS=https://data.source.coop/.sts",
          ],
        }
  );

  const caveats = [
    "Nothing was saved. This form is a design mock for #491 and writes no rows.",
    "`identity_bindings` does not exist yet, and `accounts` has no `service` type or `owner_account_id` column.",
    "Roles only ever subtract. A role can never turn a read grant into a write grant.",
    "Revoking a grant stops new access in about a minute; credentials already issued last up to an hour.",
  ];

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
