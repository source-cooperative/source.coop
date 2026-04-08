/**
 * @jest-environment node
 *
 * Tests for the products GET endpoint (/api/v1/products/[account_id]/[repository_id])
 */

// Mock the logger BEFORE importing anything else to prevent errors during import
// jest.mock("@/lib/logging", () => ({
//   LOGGER: {
//     error: jest.fn(),
//     warn: jest.fn(),
//     info: jest.fn(),
//     debug: jest.fn(),
//   },
// }));

import { NextRequest } from "next/server";
import { productsTable } from "@/lib/clients/database/products";
import {
  isIndividualAccount,
} from "@/lib/clients/database";
import { getServerSession } from "@ory/nextjs/app";
import { getOryId } from "@/lib/ory";
import { authenticateWithOidcToken } from "@/lib/api/oidc";
import { AccountType } from "@/types";

// Mock database dependencies
jest.mock("@/lib/clients/database/products", () => ({
  productsTable: {
    fetchById: jest.fn(),
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

// Mock Ory dependencies to prevent Next.js context errors
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

describe("/api/v1/products/[account_id]/[repository_id]", () => {
  const mockRepository = {
    account_id: "test-account",
    repository_id: "test-repo",
    name: "Test Repository",
    description: "A test repository",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    disabled: false,
    visibility: "restricted", // Set to restricted to test authorization
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Set up Ory mocks to return null (no session) by default
    (getServerSession as jest.Mock).mockResolvedValue(null);
    (getOryId as jest.Mock).mockReturnValue(null);

    // Set up isIndividualAccount mock to return true by default
    (isIndividualAccount as jest.Mock).mockReturnValue(true);

    // No OIDC session by default
    (authenticateWithOidcToken as jest.Mock).mockResolvedValue(null);
  });

  describe("GET /api/v1/products/[account_id]/[repository_id]", () => {
    test("returns 401 when not authenticated", async () => {
      (productsTable.fetchById as jest.Mock).mockResolvedValue(mockRepository);

      const request = new NextRequest(
        "http://localhost/api/v1/products/test-account/test-repo"
        // No Authorization header = not authenticated
      );
      const response = await GET(request, {
        params: Promise.resolve({
          account_id: "test-account",
          repository_id: "test-repo",
        }),
      });

      expect(response.status).toBe(401);
      const responseData = await response.json();
      expect(responseData).toEqual({ error: "Unauthorized" });
    });

    test("returns 404 when repository is not found", async () => {
      (productsTable.fetchById as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost/api/v1/products/test-account/nonexistent-repo"
      );
      const response = await GET(request, {
        params: Promise.resolve({
          account_id: "test-account",
          repository_id: "nonexistent-repo",
        }),
      });

      expect(response.status).toBe(404);
      const responseData = await response.json();
      expect(responseData).toEqual({
        error: "Repository with ID test-account/nonexistent-repo not found",
      });
    });

  });

  describe("org account authenticated via OIDC", () => {
    const mockOrgAccount = {
      type: AccountType.ORGANIZATION,
      account_id: "test-org",
      name: "Test Organization",
      disabled: false,
      flags: [],
    };

    beforeEach(() => {
      // Simulate OIDC resolving to an org account session (no identity_id, no memberships)
      (authenticateWithOidcToken as jest.Mock).mockResolvedValue({
        identity_id: null,
        account: mockOrgAccount,
        memberships: [],
      });
    });

    test("org account can access its own private product", async () => {
      const orgOwnedProduct = {
        ...mockRepository,
        account_id: "test-org",
        repository_id: "private-repo",
      };
      (productsTable.fetchById as jest.Mock).mockResolvedValue(orgOwnedProduct);

      const request = new NextRequest(
        "http://localhost/api/v1/products/test-org/private-repo",
        { headers: { Authorization: "Bearer oidc-token" } }
      );
      const response = await GET(request, {
        params: Promise.resolve({
          account_id: "test-org",
          repository_id: "private-repo",
        }),
      });

      expect(response.status).toBe(200);
      const responseData = await response.json();
      expect(responseData).toEqual(orgOwnedProduct);
    });

    test("org account cannot access another account's private product", async () => {
      // Product is owned by a different account
      (productsTable.fetchById as jest.Mock).mockResolvedValue(mockRepository);

      const request = new NextRequest(
        "http://localhost/api/v1/products/test-account/test-repo",
        { headers: { Authorization: "Bearer oidc-token" } }
      );
      const response = await GET(request, {
        params: Promise.resolve({
          account_id: "test-account",
          repository_id: "test-repo",
        }),
      });

      expect(response.status).toBe(401);
    });
  });
});
