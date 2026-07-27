// Regression: https://github.com/source-cooperative/source.coop/issues/461
//
// The product's data-connection admin form only offers connections from
// `availableConnections`. That list is the owning account's business: it holds
// for owners/maintainers of that account (BYOB), and is empty for a maintainer
// whose membership is scoped to this one product.
//
// The page is an async server component; we invoke it directly and inspect the
// props it hands to ProductMirrorsManager (stubbed below) rather than rendering.

import { getPageSession } from "@/lib/api/utils";
import { canManageAccount, isAdmin } from "@/lib/api/authz";
import {
  canManageDataConnection,
  canUseDataConnectionFor,
} from "@/lib/data-connections";
import { accountsTable, productsTable, dataConnectionsTable } from "@/lib/clients";
import {
  Account,
  DataConnection,
  DataProvider,
  Product,
  UserSession,
} from "@/types";
import ProductDataConnectionsPage from "./page";

jest.mock("@/lib/api/utils", () => ({ getPageSession: jest.fn() }));
jest.mock("@/lib/api/authz", () => ({
  canManageAccount: jest.fn(),
  isAdmin: jest.fn(),
}));
jest.mock("@/lib/data-connections", () => ({
  canManageDataConnection: jest.fn(),
  canUseDataConnectionFor: jest.fn(),
}));
jest.mock("@/lib/clients", () => ({
  accountsTable: { fetchById: jest.fn() },
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
const mockCanManageAccount = canManageAccount as jest.MockedFunction<
  typeof canManageAccount
>;
const mockIsAdmin = isAdmin as jest.MockedFunction<typeof isAdmin>;
const mockCanUseDataConnectionFor =
  canUseDataConnectionFor as jest.MockedFunction<typeof canUseDataConnectionFor>;
const mockCanManageDataConnection =
  canManageDataConnection as jest.MockedFunction<typeof canManageDataConnection>;
const mockAccountsTable = accountsTable as jest.Mocked<typeof accountsTable>;
const mockProductsTable = productsTable as jest.Mocked<typeof productsTable>;
const mockDataConnectionsTable = dataConnectionsTable as jest.Mocked<
  typeof dataConnectionsTable
>;

function connection(overrides: Partial<DataConnection>): DataConnection {
  return {
    data_connection_id: "conn",
    name: "Conn",
    read_only: false,
    allowed_visibilities: ["public"],
    details: {
      provider: DataProvider.S3,
      bucket: "bucket",
      base_prefix: "",
      region: "us-west-2",
    },
    ...overrides,
  } as DataConnection;
}

// A BYOB connection the org owns, plus a system-level (unowned) one.
const orgConnection = connection({
  data_connection_id: "organization--byob",
  owner: "organization",
});
const systemConnection = connection({ data_connection_id: "aws-open-data" });
const otherAccountConnection = connection({
  data_connection_id: "rival--byob",
  owner: "rival",
});

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
    canManageMirrors: boolean;
    isAdmin: boolean;
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetPageSession.mockResolvedValue({
    identity_id: "id-1",
    account: { account_id: "organization-owner-user" },
  } as UserSession);
  mockAccountsTable.fetchById.mockResolvedValue({
    account_id: "organization",
  } as Account);
  mockProductsTable.fetchById.mockResolvedValue(orgProduct);
  mockDataConnectionsTable.listAll.mockResolvedValue([
    orgConnection,
    systemConnection,
    otherAccountConnection,
  ]);
  mockDataConnectionsTable.fetchById.mockResolvedValue(orgConnection);
  mockCanManageDataConnection.mockResolvedValue(true);
  mockIsAdmin.mockReturnValue(false);
  mockCanManageAccount.mockReturnValue(true);
  // Stand in for the real predicate (unit-tested in data-connections.test.ts).
  mockCanUseDataConnectionFor.mockImplementation(
    (_session, conn, accountId) => !conn.owner || conn.owner === accountId
  );
});

describe("issue #461: product data-connections picker", () => {
  test("offers the account's own and system-level connections to an org manager", async () => {
    const props = await renderPageProps();

    expect(props.canManageMirrors).toBe(true);
    expect(props.availableConnections.map((c) => c.data_connection_id)).toEqual([
      "organization--byob",
      "aws-open-data",
    ]);
  });

  test("offers nothing to a maintainer scoped to the product alone", async () => {
    mockCanManageAccount.mockReturnValue(false);

    const props = await renderPageProps();

    expect(props.canManageMirrors).toBe(false);
    expect(props.availableConnections).toEqual([]);
    // The listing is skipped entirely rather than filtered client-side.
    expect(mockDataConnectionsTable.listAll).not.toHaveBeenCalled();
  });

  test("offers nothing when the owning account no longer exists", async () => {
    mockAccountsTable.fetchById.mockResolvedValue(null);

    const props = await renderPageProps();

    expect(props.canManageMirrors).toBe(false);
    expect(props.availableConnections).toEqual([]);
  });

  test("still marks admins as admins, for the system-connection edit link", async () => {
    mockIsAdmin.mockReturnValue(true);

    const props = await renderPageProps();

    expect(props.isAdmin).toBe(true);
    expect(props.canManageMirrors).toBe(true);
  });
});
