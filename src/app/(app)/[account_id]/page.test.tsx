/** @jest-environment node */

// Mock component imports first
jest.mock("./OrganizationProfilePage", () => ({}));
jest.mock("./IndividualProfilePage", () => ({}));

jest.mock("@/lib/clients/database", () => ({
  accountsTable: {
    fetchById: jest.fn(),
  },
  isOrganizationalAccount: jest.fn(),
}));

jest.mock("@/lib/baseUrl", () => ({
  getBaseUrl: jest.fn().mockResolvedValue("https://source.coop"),
}));

jest.mock("@/lib", () => ({
  ...jest.requireActual("@/lib"),
  CONFIG: {
    google: {
      siteVerification: "test-verification",
    },
  },
}));

import { generateMetadata } from "./page";
import { accountsTable } from "@/lib/clients/database";

describe("Account Page Metadata", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("returns OpenGraph metadata for existing account", async () => {
    const mockAccount = {
      id: "test-account",
      account_id: "test-account",
      name: "Test Account",
      type: "individual" as const,
      metadata_public: {
        bio: "Test Account on Source.coop",
      },
    };

    (accountsTable.fetchById as jest.Mock).mockResolvedValue(mockAccount);

    const metadata = await generateMetadata({
      params: Promise.resolve({ account_id: "test-account" }),
      searchParams: Promise.resolve({}),
    });

    expect(metadata.title).toBe("Test Account · Individual · Source Cooperative");
    expect(metadata.description).toBe("Test Account on Source.coop");

    // Test OpenGraph metadata
    expect(metadata.openGraph).toBeDefined();
    expect(metadata.openGraph?.title).toBe("Test Account · Individual · Source Cooperative");
    expect(metadata.openGraph?.description).toBe("Test Account on Source.coop");
    expect(metadata.openGraph?.url).toBe("https://source.coop/test-account");

    // Test OpenGraph image
    expect(metadata.openGraph?.images).toBeDefined();
    expect(Array.isArray(metadata.openGraph?.images)).toBe(true);
    expect(metadata.openGraph?.images?.[0]).toMatchObject({
      url: "https://source.coop/api/og?type=account&account_id=test-account",
      width: 1200,
      height: 390,
    });

    // Test Twitter metadata
    expect(metadata.twitter).toBeDefined();
    expect(metadata.twitter?.title).toBe("Test Account · Individual · Source Cooperative");
    expect(metadata.twitter?.description).toBe("Test Account on Source.coop");
    expect(metadata.twitter?.images).toContain("https://source.coop/api/og?type=account&account_id=test-account");
  });

  it("returns default values when account is not found", async () => {
    (accountsTable.fetchById as jest.Mock).mockResolvedValue(null);

    const metadata = await generateMetadata({
      params: Promise.resolve({ account_id: "test-account" }),
      searchParams: Promise.resolve({}),
    });

    expect(metadata.title).toBe("Page Not Found · Source Cooperative");
    expect(metadata.description).toBe("The page you are looking for does not exist.");
  });
});
