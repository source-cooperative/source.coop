import type { ServiceAccountFormValues } from "./plan";

/**
 * Fabricated service accounts for the #491 mock. Nothing is stored, so the
 * list view needs something to show. Parameterised by owner so they look
 * plausible on whichever account you are viewing.
 */
export interface MockServiceAccount {
  values: ServiceAccountFormValues;
  lastAuthenticated: string | null;
  createdAt: string;
  disabled?: boolean;
}

export function mockServiceAccounts(
  ownerAccountId: string,
  productIds: string[]
): MockServiceAccount[] {
  const [first, second] = productIds;

  return [
    {
      values: {
        name: "Nightly Sync",
        ownerAccountId,
        signInMethods: [
          {
            kind: "github",
            repository: `${ownerAccountId}/data-pipeline`,
            ref: "refs/heads/main",
          },
        ],
        accessScope: first ? "subset" : "all",
        allPermission: "write",
        productGrants: first
          ? [{ product_id: first, permission: "write" }]
          : [],
        allowedRoles: ["full_access", "read_only"],
      },
      lastAuthenticated: "3 hours ago",
      createdAt: "12 Mar 2026",
    },
    {
      values: {
        name: "Metrics Reader",
        ownerAccountId,
        signInMethods: [{ kind: "api_key", expiresInDays: 90 }],
        accessScope: "all",
        allPermission: "read",
        productGrants: [],
        // Full access deliberately unticked: this one can never write, even if
        // someone later widens its grants.
        allowedRoles: ["read_only"],
      },
      lastAuthenticated: "6 days ago",
      createdAt: "2 Feb 2026",
    },
    {
      values: {
        name: "Archive Loader",
        ownerAccountId,
        signInMethods: [
          {
            kind: "github",
            repository: `${ownerAccountId}/archive-tools`,
            ref: "refs/heads/release",
          },
          { kind: "api_key", expiresInDays: null },
        ],
        accessScope: second ? "subset" : "all",
        allPermission: "write",
        productGrants: second
          ? [{ product_id: second, permission: "write" }]
          : [],
        allowedRoles: ["full_access", "read_only"],
      },
      lastAuthenticated: null,
      createdAt: "28 Jul 2026",
      disabled: true,
    },
  ];
}
