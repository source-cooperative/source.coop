import { type DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { AccountsTable } from "./accounts";
import { createMemoizedRead } from "./request-cache";
import { fakeReactCache } from "./__test-helpers__/fake-react-cache";
import { AccountType, type Account } from "@/types";

jest.mock("@/lib/config", () => ({
  CONFIG: { environment: { stage: "test" }, database: {} },
}));
jest.mock("@/lib/logging", () => ({
  LOGGER: { error: jest.fn(), debug: jest.fn(), info: jest.fn() },
}));

const account = (fields: Partial<Account>): Account =>
  ({
    type: AccountType.INDIVIDUAL,
    disabled: false,
    ...fields,
  }) as Account;

const ITEMS = [
  account({ account_id: "jane-doe", name: "Jane Doe", type: AccountType.INDIVIDUAL }),
  account({ account_id: "jsmith", name: "John Smith", type: AccountType.INDIVIDUAL }),
  account({ account_id: "acme", name: "Jane's Lab", type: AccountType.ORGANIZATION }),
  account({ account_id: "janitor", name: "Jan Retired", disabled: true }),
  account({
    account_id: "acme-bot",
    name: "Acme Bot",
    type: AccountType.SERVICE,
    owner_account_id: "acme",
  } as Partial<Account>),
];

function tableFor(items: Account[], extra: Record<string, any> = {}) {
  const send = jest.fn().mockResolvedValue({ Items: items, ...extra });
  const table = new AccountsTable({
    client: { send } as unknown as DynamoDBDocumentClient,
    memoizedRead: createMemoizedRead(fakeReactCache),
  });
  return { table, send };
}

describe("AccountsTable.searchMemberCandidates", () => {
  it("matches the handle or the display name, case-insensitively", async () => {
    const { table } = tableFor(ITEMS);

    expect(await table.searchMemberCandidates("JANE")).toEqual([
      { account_id: "jane-doe", name: "Jane Doe", type: AccountType.INDIVIDUAL },
    ]);
    expect(await table.searchMemberCandidates("smith")).toEqual([
      { account_id: "jsmith", name: "John Smith", type: AccountType.INDIVIDUAL },
    ]);
  });

  it("carries the public profile image, and never an email", async () => {
    // The picker draws the same account card the profile hover card does, which
    // needs the avatar. Emails must not ride along: the Gravatar fallback used
    // elsewhere would expose an address hash for every account a search matches.
    const { table, send } = tableFor([
      account({
        account_id: "jane-doe",
        name: "Jane Doe",
        metadata_public: { profile_image: "https://example.test/jane.png" },
        emails: [{ address: "jane@example.test", is_primary: true }],
      } as Partial<Account>),
    ]);

    expect(await table.searchMemberCandidates("jane")).toEqual([
      {
        account_id: "jane-doe",
        name: "Jane Doe",
        type: AccountType.INDIVIDUAL,
        profile_image: "https://example.test/jane.png",
      },
    ]);

    const projection = send.mock.calls[0][0].input.ProjectionExpression;
    expect(projection).toContain("metadata_public.profile_image");
    expect(projection).not.toContain("emails");
  });

  it("skips organizations and disabled accounts", async () => {
    const { table } = tableFor(ITEMS);

    // "jan" is a substring of the org's name and the disabled account's handle.
    expect(await table.searchMemberCandidates("jan")).toEqual([
      { account_id: "jane-doe", name: "Jane Doe", type: AccountType.INDIVIDUAL },
    ]);
  });

  it("offers the service accounts owned by memberOf, and no others", async () => {
    const { table } = tableFor(ITEMS);

    expect(await table.searchMemberCandidates("acme", "acme")).toEqual([
      { account_id: "acme-bot", name: "Acme Bot", type: AccountType.SERVICE },
    ]);
    expect(await table.searchMemberCandidates("acme")).toEqual([]);
    expect(await table.searchMemberCandidates("acme", "someone-else")).toEqual([]);
  });

  it("includes disabled accounts on request, and says which they are", async () => {
    const { table } = tableFor(ITEMS);

    expect(
      await table.searchMemberCandidates("jan", undefined, { includeDisabled: true })
    ).toEqual([
      { account_id: "jane-doe", name: "Jane Doe", type: AccountType.INDIVIDUAL },
      { account_id: "janitor", name: "Jan Retired", type: AccountType.INDIVIDUAL, disabled: true },
    ]);
  });

  it("returns nothing for an empty query without hitting DynamoDB", async () => {
    const { table, send } = tableFor(ITEMS);

    expect(await table.searchMemberCandidates("  ")).toEqual([]);
    expect(send).not.toHaveBeenCalled();
  });

  it("stops scanning once the limit is reached", async () => {
    // LastEvaluatedKey would otherwise drive a second page.
    const { table, send } = tableFor(ITEMS, { LastEvaluatedKey: { account_id: "x" } });

    expect(await table.searchMemberCandidates("j", undefined, { limit: 1 })).toEqual([
      { account_id: "jane-doe", name: "Jane Doe", type: AccountType.INDIVIDUAL },
    ]);
    expect(send).toHaveBeenCalledTimes(1);
  });
});
