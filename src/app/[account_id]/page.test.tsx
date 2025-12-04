/** @jest-environment node */

// Mock component imports first
jest.mock("./OrganizationProfilePage", () => ({}));
jest.mock("./IndividualProfilePage", () => ({}));
jest.mock("@/components", () => ({}));

jest.mock("@/lib/clients/database", () => ({
  accountsTable: {
    fetchById: jest.fn(),
  },
  isOrganizationalAccount: jest.fn(),
}));

import { generateMetadata } from "./page";
import { accountsTable } from "@/lib/clients/database";

describe("Account Page Metadata", () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it("returns OpenGraph metadata for existing account", async () => {
    const mockAccount = {
      id: "test-account",
      name: "Test Account",
    };

    (accountsTable.fetchById as jest.Mock).mockResolvedValue(mockAccount);

    const params = Promise.resolve({
      account_id: "test-account",
    });

    const metadata = await generateMetadata({ params });

    expect(metadata.title).toBe("Test Account | Source Cooperative");
    expect(metadata.description).toBe("Test Account on Source.coop");
    expect(metadata.openGraph).toBeDefined();
    expect(metadata.openGraph?.title).toBe("Test Account | Source Cooperative");
    expect(metadata.openGraph?.description).toBe("Test Account on Source.coop");
    expect(metadata.openGraph?.type).toBe("profile");
    expect(metadata.twitter).toBeDefined();
    expect(metadata.twitter?.card).toBe("summary_large_image");
    expect(metadata.twitter?.title).toBe("Test Account | Source Cooperative");
    expect(metadata.twitter?.description).toBe("Test Account on Source.coop");
  });

  it("returns default values when account is not found", async () => {
    (accountsTable.fetchById as jest.Mock).mockResolvedValue(null);

    const params = Promise.resolve({
      account_id: "test-account",
    });

    const metadata = await generateMetadata({ params });

    expect(metadata.title).toBe("Account Not Found | Source Cooperative");
    expect(metadata.description).toBe("Account Not Found");
    expect(metadata.openGraph?.title).toBe(
      "Account Not Found | Source Cooperative"
    );
    expect(metadata.openGraph?.description).toBe("Account Not Found");
    expect(metadata.openGraph?.type).toBe("profile");
  });
});
