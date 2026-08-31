import NewProductPage from "./page";
import { accountsTable, membershipsTable, getPageSession } from "@/lib";
import { listUsableDataConnections } from "@/lib/data-connections";
import {
  Account,
  Membership,
  MembershipRole,
  MembershipState,
  UserSession,
} from "@/types";

jest.mock("@/lib", () => ({
  getPageSession: jest.fn(),
  accountsTable: { fetchManyByIds: jest.fn() },
  membershipsTable: { listByUser: jest.fn() },
}));

jest.mock("@/lib/data-connections", () => ({
  listUsableDataConnections: jest.fn(),
}));

jest.mock("@/lib/api/authz", () => ({
  isAuthorized: jest.fn(() => true),
}));

const mockGetPageSession = getPageSession as jest.MockedFunction<
  typeof getPageSession
>;
const mockAccountsTable = accountsTable as jest.Mocked<typeof accountsTable>;
const mockMembershipsTable = membershipsTable as jest.Mocked<
  typeof membershipsTable
>;
const mockListUsable = listUsableDataConnections as jest.MockedFunction<
  typeof listUsableDataConnections
>;

function membership(overrides: Partial<Membership>): Membership {
  return {
    membership_id: "m",
    account_id: "user",
    membership_account_id: "org",
    role: MembershipRole.Owners,
    state: MembershipState.Member,
    ...overrides,
  } as Membership;
}

/** The account ids the page decides may own the new product. */
async function ownerIdsPassedToConnectionListing(memberships: Membership[]) {
  mockMembershipsTable.listByUser.mockResolvedValue(memberships);
  mockAccountsTable.fetchManyByIds.mockImplementation(async (ids: string[]) =>
    ids.map((account_id) => ({ account_id }) as Account)
  );
  await NewProductPage({ params: Promise.resolve({}), searchParams: Promise.resolve({}) } as never);
  return mockListUsable.mock.calls.at(-1)?.[1];
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetPageSession.mockResolvedValue({
    identity_id: "id-1",
    account: { account_id: "user", flags: [] },
  } as unknown as UserSession);
  mockListUsable.mockResolvedValue([]);
});

// The list drives which owned connections are serialized into the page, so a
// membership that can't own a product must not widen it (see #462).
describe("NewProductPage owner scoping", () => {
  test("includes an account the user owns account-wide", async () => {
    expect(
      await ownerIdsPassedToConnectionListing([
        membership({ membership_account_id: "org-a" }),
      ])
    ).toEqual(["user", "org-a"]);
  });

  test("includes an account-wide maintainer's account", async () => {
    expect(
      await ownerIdsPassedToConnectionListing([
        membership({
          membership_account_id: "org-a",
          role: MembershipRole.Maintainers,
        }),
      ])
    ).toEqual(["user", "org-a"]);
  });

  test("excludes an account where the membership is scoped to one product", async () => {
    expect(
      await ownerIdsPassedToConnectionListing([
        membership({ membership_account_id: "org-b", repository_id: "prod-1" }),
      ])
    ).toEqual(["user"]);
  });

  test("excludes an account where the user only reads data", async () => {
    expect(
      await ownerIdsPassedToConnectionListing([
        membership({
          membership_account_id: "org-b",
          role: MembershipRole.ReadData,
        }),
      ])
    ).toEqual(["user"]);
  });

  test("excludes an invited-but-not-yet-member account", async () => {
    expect(
      await ownerIdsPassedToConnectionListing([
        membership({
          membership_account_id: "org-b",
          state: MembershipState.Invited,
        }),
      ])
    ).toEqual(["user"]);
  });
});
