/**
 * @jest-environment node
 *
 * Tests for the products listing endpoint (/api/v1/products/[account_id])
 * Focuses on org account access via OIDC authentication.
 */

// Set environment variable BEFORE importing anything else
process.env.SOURCE_KEY = "test-source-key-123";

import { NextRequest } from "next/server";
import { productsTable } from "@/lib/clients/database/products";
import {
  apiKeysTable,
  accountsTable,
  membershipsTable,
  isIndividualAccount,
} from "@/lib/clients/database";
import { getServerSession } from "@ory/nextjs/app";
import { getOryId } from "@/lib/ory";
import { authenticateWithOidcToken } from "@/lib/api/oidc";
import { AccountType } from "@/types";

jest.mock("@/lib/clients/database/products", () => ({
  productsTable: {
    listByAccount: jest.fn(),
  },
}));

jest.mock("@/lib/clients/database", () => ({
  apiKeysTable: {
    fetchById: jest.fn(),
  },
  accountsTable: {
    fetchById: jest.fn(),
  },
  membershipsTable: {
    listByUser: jest.fn(),
  },
  isIndividualAccount: jest.fn(),
}));

jest.mock("@/lib/clients/database/accounts", () => ({
  accountsTable: {
    fetchById: jest.fn(),
  },
}));

jest.mock("@ory/nextjs/app", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("@/lib/ory", () => ({
  getOryId: jest.fn(),
}));

jest.mock("@/lib/api/oidc", () => ({
  authenticateWithOidcToken: jest.fn(),
}));

const { GET } = require("./route");

// Import the accounts mock used by the route (from database/accounts)
import { accountsTable as routeAccountsTable } from "@/lib/clients/database/accounts";

describe("/api/v1/products/[account_id]", () => {
  const mockOrgAccount = {
    type: AccountType.ORGANIZATION,
    account_id: "test-org",
    name: "Test Organization",
    disabled: false,
    flags: [],
  };

  const mockPublicProduct = {
    account_id: "test-org",
    product_id: "public-repo",
    name: "Public Repo",
    visibility: "public",
    disabled: false,
  };

  const mockPrivateProduct = {
    account_id: "test-org",
    product_id: "private-repo",
    name: "Private Repo",
    visibility: "restricted",
    disabled: false,
  };

  const mockDisabledProduct = {
    account_id: "test-org",
    product_id: "disabled-repo",
    name: "Disabled Repo",
    visibility: "restricted",
    disabled: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getServerSession as jest.Mock).mockResolvedValue(null);
    (getOryId as jest.Mock).mockReturnValue(null);
    (authenticateWithOidcToken as jest.Mock).mockResolvedValue(null);
  });

  describe("org account authenticated via OIDC", () => {
    beforeEach(() => {
      // Simulate OIDC resolving to an org account session
      (authenticateWithOidcToken as jest.Mock).mockResolvedValue({
        identity_id: null,
        account: mockOrgAccount,
        memberships: [],
      });

      // The route also calls accountsTable.fetchById for the account_id path param
      (routeAccountsTable.fetchById as jest.Mock).mockResolvedValue(
        mockOrgAccount
      );
    });

    test("org account can list its own public and private products", async () => {
      (productsTable.listByAccount as jest.Mock).mockResolvedValue({
        products: [mockPublicProduct, mockPrivateProduct],
      });

      const request = new NextRequest(
        "http://localhost/api/v1/products/test-org",
        { headers: { Authorization: "Bearer oidc-token" } }
      );
      const response = await GET(request, {
        params: Promise.resolve({ account_id: "test-org" }),
      });

      expect(response.status).toBe(200);
      const { products } = await response.json();
      expect(products).toHaveLength(2);
      expect(products).toContainEqual(
        expect.objectContaining({ product_id: "public-repo" })
      );
      expect(products).toContainEqual(
        expect.objectContaining({ product_id: "private-repo" })
      );
    });

    test("org account does not see disabled products", async () => {
      (productsTable.listByAccount as jest.Mock).mockResolvedValue({
        products: [mockPublicProduct, mockDisabledProduct],
      });

      const request = new NextRequest(
        "http://localhost/api/v1/products/test-org",
        { headers: { Authorization: "Bearer oidc-token" } }
      );
      const response = await GET(request, {
        params: Promise.resolve({ account_id: "test-org" }),
      });

      expect(response.status).toBe(200);
      const { products } = await response.json();
      expect(products).toHaveLength(1);
      expect(products).toContainEqual(
        expect.objectContaining({ product_id: "public-repo" })
      );
      expect(products).not.toContainEqual(
        expect.objectContaining({ product_id: "disabled-repo" })
      );
    });

    test("org account cannot see private products of a different account", async () => {
      const otherAccountPrivateProduct = {
        ...mockPrivateProduct,
        account_id: "other-org",
        product_id: "other-private-repo",
      };

      // Route fetches the other org's account for the path param
      (routeAccountsTable.fetchById as jest.Mock).mockResolvedValue({
        ...mockOrgAccount,
        account_id: "other-org",
      });
      (productsTable.listByAccount as jest.Mock).mockResolvedValue({
        products: [otherAccountPrivateProduct],
      });

      const request = new NextRequest(
        "http://localhost/api/v1/products/other-org",
        { headers: { Authorization: "Bearer oidc-token" } }
      );
      const response = await GET(request, {
        params: Promise.resolve({ account_id: "other-org" }),
      });

      expect(response.status).toBe(200);
      const { products } = await response.json();
      // Private product of another account should be filtered out
      expect(products).toHaveLength(0);
    });

    test("returns 404 when account does not exist", async () => {
      (routeAccountsTable.fetchById as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost/api/v1/products/nonexistent",
        { headers: { Authorization: "Bearer oidc-token" } }
      );
      const response = await GET(request, {
        params: Promise.resolve({ account_id: "nonexistent" }),
      });

      expect(response.status).toBe(404);
    });
  });

  describe("anonymous access", () => {
    test("anonymous user sees only public products", async () => {
      (routeAccountsTable.fetchById as jest.Mock).mockResolvedValue(
        mockOrgAccount
      );
      (productsTable.listByAccount as jest.Mock).mockResolvedValue({
        products: [mockPublicProduct, mockPrivateProduct],
      });

      const request = new NextRequest(
        "http://localhost/api/v1/products/test-org"
      );
      const response = await GET(request, {
        params: Promise.resolve({ account_id: "test-org" }),
      });

      expect(response.status).toBe(200);
      const { products } = await response.json();
      expect(products).toHaveLength(1);
      expect(products[0].product_id).toBe("public-repo");
    });
  });
});
