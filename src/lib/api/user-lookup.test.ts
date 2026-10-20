import { searchUsers } from "./user-lookup";
import { accountsTable } from "../clients";
import { getOryIdentityIdByEmail } from "./utils";
import { AccountType, type IndividualAccount } from "@/types";

jest.mock("../clients", () => ({
  accountsTable: { fetchByOryId: jest.fn(), searchMemberCandidates: jest.fn() },
}));
jest.mock("./utils", () => ({ getOryIdentityIdByEmail: jest.fn() }));
jest.mock("@/lib/logging", () => ({ LOGGER: { info: jest.fn() } }));

const table = accountsTable as jest.Mocked<typeof accountsTable>;
const byEmail = getOryIdentityIdByEmail as jest.MockedFunction<
  typeof getOryIdentityIdByEmail
>;

beforeEach(() => jest.clearAllMocks());

test("an email goes through Ory and yields that one account", async () => {
  byEmail.mockResolvedValue("ory-1");
  table.fetchByOryId.mockResolvedValue({
    account_id: "jane",
    name: "Jane Doe",
    type: AccountType.INDIVIDUAL,
    disabled: true,
    metadata_public: { profile_image: "https://x/j.png" },
  } as IndividualAccount);

  expect(await searchUsers(" jane@example.com ")).toEqual({
    source: "ory",
    identityFound: true,
    results: [
      {
        account_id: "jane",
        name: "Jane Doe",
        type: AccountType.INDIVIDUAL,
        profile_image: "https://x/j.png",
        disabled: true,
      },
    ],
  });
  expect(byEmail).toHaveBeenCalledWith("jane@example.com");
  expect(table.searchMemberCandidates).not.toHaveBeenCalled();
});

test("an email unknown to Ory, or without a profile, is told apart", async () => {
  byEmail.mockResolvedValue(null);
  expect(await searchUsers("nobody@example.com")).toEqual({
    source: "ory",
    identityFound: false,
    results: [],
  });

  byEmail.mockResolvedValue("ory-2");
  table.fetchByOryId.mockResolvedValue(null);
  expect(await searchUsers("orphan@example.com")).toEqual({
    source: "ory",
    identityFound: true,
    results: [],
  });
});

test("anything else searches handles and names, disabled included", async () => {
  table.searchMemberCandidates.mockResolvedValue([
    { account_id: "nissim", name: "Nissim", type: AccountType.INDIVIDUAL },
  ]);

  expect(await searchUsers("nissim")).toEqual({
    source: "database",
    results: [
      { account_id: "nissim", name: "Nissim", type: AccountType.INDIVIDUAL },
    ],
  });
  expect(table.searchMemberCandidates).toHaveBeenCalledWith(
    "nissim",
    undefined,
    {
      includeDisabled: true,
    },
  );
  expect(byEmail).not.toHaveBeenCalled();
});

test("a blank query touches nothing", async () => {
  expect(await searchUsers("   ")).toEqual({ source: "database", results: [] });
  expect(byEmail).not.toHaveBeenCalled();
  expect(table.searchMemberCandidates).not.toHaveBeenCalled();
});
