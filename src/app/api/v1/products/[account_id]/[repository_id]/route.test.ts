/**
 * @jest-environment node
 *
 * Tests for the products GET endpoint (/api/v1/products/[account_id]/[repository_id])
 */

// Set environment variable BEFORE importing anything else
process.env.SOURCE_KEY = "test-source-key-123";

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
  apiKeysTable,
  accountsTable,
  membershipsTable,
  isIndividualAccount,
} from "@/lib/clients/database";
import { getServerSession } from "@ory/nextjs/app";
import { getOryId } from "@/lib/ory";
import { AccountType, ProductDataMode } from "@/types";

// Mock database dependencies for testing real authentication
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
    data_mode: ProductDataMode.Private, // Set to private mode to test authorization
  };

  // Test SOURCE_KEY value (set at module level)
  const testSourceKey = "test-source-key-123";

  // Mock user account for API key authentication tests
  const mockUserAccount = {
    type: AccountType.INDIVIDUAL,
    identity_id: "user-123",
    name: "Test User",
    account_id: "user-123",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    disabled: false,
    flags: [],
    metadata_public: {},
    emails: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Set up Ory mocks to return null (no session) by default
    (getServerSession as jest.Mock).mockResolvedValue(null);
    (getOryId as jest.Mock).mockReturnValue(null);

    // Set up isIndividualAccount mock to return true by default
    (isIndividualAccount as jest.Mock).mockReturnValue(true);
  });

  describe("GET /api/v1/products/[account_id]/[repository_id]", () => {
    test("returns repository when authenticated with SOURCE_KEY (API secret)", async () => {
      // Test real SOURCE_KEY authentication
      (productsTable.fetchById as jest.Mock).mockResolvedValue(mockRepository);

      const request = new NextRequest(
        "http://localhost/api/v1/products/test-account/test-repo",
        {
          headers: {
            Authorization: testSourceKey, // Use real SOURCE_KEY authentication
          },
        }
      );
      const response = await GET(request, {
        params: Promise.resolve({
          account_id: "test-account",
          repository_id: "test-repo",
        }),
      });

      expect(response.status).toBe(200);
      const responseData = await response.json();
      expect(responseData).toEqual(mockRepository);
      expect(productsTable.fetchById).toHaveBeenCalledWith(
        "test-account",
        "test-repo"
      );
    });

    test("returns repository when authenticated with API key", async () => {
      // Create a repository owned by the regular user
      const userOwnedRepository = {
        ...mockRepository,
        account_id: "user-123", // User owns this repository
      };

      // Mock API key authentication
      const mockApiKey = {
        access_key_id: "test-key-123",
        secret_access_key: "test-secret-456",
        account_id: "user-123",
        disabled: false,
      };

      (apiKeysTable.fetchById as jest.Mock).mockResolvedValue(mockApiKey);
      (accountsTable.fetchById as jest.Mock).mockResolvedValue(mockUserAccount);
      (membershipsTable.listByUser as jest.Mock).mockResolvedValue([]);
      (productsTable.fetchById as jest.Mock).mockResolvedValue(
        userOwnedRepository
      );

      const request = new NextRequest(
        "http://localhost/api/v1/products/user-123/test-repo",
        {
          headers: {
            Authorization: "test-key-123 test-secret-456", // API key format
          },
        }
      );
      const response = await GET(request, {
        params: Promise.resolve({
          account_id: "user-123",
          repository_id: "test-repo",
        }),
      });

      expect(response.status).toBe(200);
      const responseData = await response.json();
      expect(responseData).toEqual(userOwnedRepository);
    });

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

    test("returns 401 when user is not authorized for the repository", async () => {
      // Mock API key authentication for a different user
      const mockApiKey = {
        access_key_id: "other-key-123",
        secret_access_key: "other-secret-456",
        account_id: "other-user-456", // Different user
        disabled: false,
      };

      const otherUserAccount = {
        ...mockUserAccount,
        account_id: "other-user-456",
      };

      (apiKeysTable.fetchById as jest.Mock).mockResolvedValue(mockApiKey);
      (accountsTable.fetchById as jest.Mock).mockResolvedValue(
        otherUserAccount
      );
      (membershipsTable.listByUser as jest.Mock).mockResolvedValue([]);
      (productsTable.fetchById as jest.Mock).mockResolvedValue(mockRepository);

      const request = new NextRequest(
        "http://localhost/api/v1/products/test-account/test-repo",
        {
          headers: {
            Authorization: "other-key-123 other-secret-456", // Different user's API key
          },
        }
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
        "http://localhost/api/v1/products/test-account/nonexistent-repo",
        {
          headers: {
            Authorization: testSourceKey, // Use SOURCE_KEY for this test
          },
        }
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

    test("returns 500 when database error occurs", async () => {
      // Suppress console.error for this test to avoid error output
      const originalError = console.error;
      console.error = jest.fn();

      (productsTable.fetchById as jest.Mock).mockRejectedValue(
        new Error("Database connection failed")
      );

      const request = new NextRequest(
        "http://localhost/api/v1/products/test-account/test-repo",
        {
          headers: {
            Authorization: testSourceKey, // Use SOURCE_KEY for this test
          },
        }
      );
      const response = await GET(request, {
        params: Promise.resolve({
          account_id: "test-account",
          repository_id: "test-repo",
        }),
      });

      expect(response.status).toBe(500);
      const responseData = await response.json();
      expect(responseData).toEqual({ error: "Database connection failed" });

      // Restore console.error
      console.error = originalError;
    });

    test("handles SOURCE_KEY authentication with proper admin privileges", async () => {
      // This test specifically validates that SOURCE_KEY authentication works
      // and that the admin account created for API secret has proper privileges
      (productsTable.fetchById as jest.Mock).mockResolvedValue(mockRepository);

      const request = new NextRequest(
        "http://localhost/api/v1/products/test-account/test-repo",
        {
          headers: {
            Authorization: testSourceKey, // Use real SOURCE_KEY authentication
          },
        }
      );
      const response = await GET(request, {
        params: Promise.resolve({
          account_id: "test-account",
          repository_id: "test-repo",
        }),
      });

      expect(response.status).toBe(200);
      const responseData = await response.json();
      expect(responseData).toEqual(mockRepository);
    });

    test("validates SOURCE_KEY authentication flow end-to-end", async () => {
      // This test simulates the complete flow of SOURCE_KEY authentication
      // using real authentication logic
      (productsTable.fetchById as jest.Mock).mockResolvedValue(mockRepository);

      // Simulate a request with SOURCE_KEY in Authorization header
      const request = new NextRequest(
        "http://localhost/api/v1/products/test-account/test-repo",
        {
          headers: {
            Authorization: testSourceKey, // Use real SOURCE_KEY value
          },
        }
      );

      const response = await GET(request, {
        params: Promise.resolve({
          account_id: "test-account",
          repository_id: "test-repo",
        }),
      });

      expect(response.status).toBe(200);
      const responseData = await response.json();
      expect(responseData).toEqual(mockRepository);

      // Verify the database was called correctly
      expect(productsTable.fetchById).toHaveBeenCalledWith(
        "test-account",
        "test-repo"
      );
    });
  });
});
