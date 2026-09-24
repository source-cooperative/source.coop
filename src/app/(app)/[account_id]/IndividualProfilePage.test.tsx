/** @jest-environment node */

jest.mock("@/lib/clients/database", () => ({
  accountsTable: {
    fetchManyByIds: jest.fn().mockResolvedValue([]),
  },
  isOrganizationalAccount: jest.fn().mockReturnValue(false),
  membershipsTable: {
    listByUser: jest.fn().mockResolvedValue([]),
  },
  productsTable: {
    listByAccount: jest.fn(),
  },
}));

jest.mock("@/lib/api/utils", () => ({
  getPageSession: jest.fn(),
}));

jest.mock("@/lib/api/authz", () => ({
  isAuthorized: jest.fn().mockReturnValue(true),
  canCreateProductForAccount: jest.fn().mockReturnValue(false),
}));

jest.mock("@/components/features/profiles/IndividualProfile", () => ({
  IndividualProfile: jest.fn(() => null),
}));

import { productsTable } from "@/lib/clients/database";
import { getPageSession } from "@/lib/api/utils";
import { IndividualProfile } from "@/components/features/profiles/IndividualProfile";
import { IndividualProfilePage } from "./IndividualProfilePage";
import type { IndividualAccount } from "@/types";

const account = {
  account_id: "test-account",
  type: "individual",
  name: "Test Account",
} as IndividualAccount;

const products = [
  { product_id: "public-product", visibility: "public" },
  { product_id: "unlisted-product", visibility: "unlisted" },
];

describe("IndividualProfilePage", () => {
  beforeEach(() => {
    (productsTable.listByAccount as jest.Mock).mockResolvedValue({
      products,
      lastEvaluatedKey: undefined,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("hides unlisted products from a non-owner viewer", async () => {
    (getPageSession as jest.Mock).mockResolvedValue(null);

    await IndividualProfilePage({ account, showWelcome: false });

    const ownedProducts = (IndividualProfile as jest.Mock).mock.calls[0][0]
      .ownedProducts;
    expect(ownedProducts).toHaveLength(1);
    expect(ownedProducts[0].product_id).toBe("public-product");
  });

  it("keeps unlisted products visible to the owner", async () => {
    (getPageSession as jest.Mock).mockResolvedValue({ account });

    await IndividualProfilePage({ account, showWelcome: false });

    const ownedProducts = (IndividualProfile as jest.Mock).mock.calls[0][0]
      .ownedProducts;
    expect(ownedProducts).toHaveLength(2);
  });
});
