// Regression: https://github.com/source-cooperative/source.coop/issues/461
//
// The product's data-connection admin form only offers connections from
// `availableConnections`, which this page populates for admins only. A non-admin
// org owner whose org owns the connection therefore sees an empty picker and
// cannot associate it with their product.
//
// The page is an async server component; we invoke it directly and inspect the
// props it hands to ProductMirrorsManager (stubbed below) rather than rendering.

import { getPageSession } from "@/lib/api/utils";
import { isAdmin } from "@/lib/api/authz";
import { canManageDataConnection } from "@/lib/data-connections";
import { productsTable, dataConnectionsTable } from "@/lib/clients";
import { DataConnection, DataProvider, Product, UserSession } from "@/types";
import ProductDataConnectionsPage from "./page";

jest.mock("@/lib/api/utils", () => ({ getPageSession: jest.fn() }));
jest.mock("@/lib/api/authz", () => ({ isAdmin: jest.fn() }));
jest.mock("@/lib/data-connections", () => ({
  canManageDataConnection: jest.fn(),
}));
jest.mock("@/lib/clients", () => ({
  productsTable: { fetchById: jest.fn() },
  dataConnectionsTable: { fetchById: jest.fn(), listAll: jest.fn() },
}));
jest.mock("@/components/features/data-connections", () => ({
  ProductMirrorsManager: () => null,
}));
jest.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("notFound");
  },
}));

const mockGetPageSession = getPageSession as jest.MockedFunction<
  typeof getPageSession
>;
const mockIsAdmin = isAdmin as jest.MockedFunction<typeof isAdmin>;
const mockCanManageDataConnection =
  canManageDataConnection as jest.MockedFunction<typeof canManageDataConnection>;
const mockProductsTable = productsTable as jest.Mocked<typeof productsTable>;
const mockDataConnectionsTable = dataConnectionsTable as jest.Mocked<
  typeof dataConnectionsTable
>;

// A connection the org owns (BYOB), created through the account-scoped UI.
const orgConnection = {
  data_connection_id: "organization--byob",
  name: "Org BYOB",
  read_only: false,
  allowed_visibilities: ["public"],
  owner: "organization",
  details: {
    provider: DataProvider.S3,
    bucket: "org-bucket",
    base_prefix: "",
    region: "us-west-2",
  },
} as unknown as DataConnection;

const orgProduct = {
  account_id: "organization",
  product_id: "prod",
  metadata: { mirrors: {}, primary_mirror: "" },
} as unknown as Product;

const params = Promise.resolve({
  account_id: "organization",
  product_id: "prod",
});

async function renderPageProps() {
  const element = await ProductDataConnectionsPage({ params });
  return element.props as {
    availableConnections: { data_connection_id: string }[];
    isAdmin: boolean;
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetPageSession.mockResolvedValue({
    identity_id: "id-1",
    account: { account_id: "organization-owner-user" },
  } as UserSession);
  mockProductsTable.fetchById.mockResolvedValue(orgProduct);
  mockDataConnectionsTable.listAll.mockResolvedValue([orgConnection]);
  mockDataConnectionsTable.fetchById.mockResolvedValue(orgConnection);
  mockCanManageDataConnection.mockResolvedValue(true);
});

describe("issue #461: product data-connections picker", () => {
  test("offers a connection the caller may manage to a non-admin", async () => {
    mockIsAdmin.mockReturnValue(false);

    const props = await renderPageProps();

    expect(props.availableConnections.map((c) => c.data_connection_id)).toEqual([
      "organization--byob",
    ]);
  });

  test("does not offer a connection the caller may not manage", async () => {
    mockIsAdmin.mockReturnValue(false);
    mockCanManageDataConnection.mockResolvedValue(false);

    const props = await renderPageProps();

    expect(props.availableConnections).toEqual([]);
  });

  test("still offers every connection to an admin", async () => {
    mockIsAdmin.mockReturnValue(true);

    const props = await renderPageProps();

    expect(props.availableConnections.map((c) => c.data_connection_id)).toEqual([
      "organization--byob",
    ]);
    expect(props.isAdmin).toBe(true);
  });
});
