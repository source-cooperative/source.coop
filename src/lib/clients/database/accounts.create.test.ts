import { AccountsTable } from "./accounts";
import { IdentityBindingsTable } from "./identity-bindings";
import { createMemoizedRead } from "./request-cache";
import { fakeReactCache } from "./__test-helpers__/fake-react-cache";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { AccountType, type Account } from "@/types";

jest.mock("@/lib/config", () => ({
  CONFIG: {
    environment: { stage: "test" },
    database: {},
    auth: { api: { backendUrl: "http://ory.test" } },
  },
}));

jest.mock("@/lib/logging", () => ({
  LOGGER: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

function makeAccount(overrides: Partial<Account> = {}): Account {
  return {
    account_id: "victim",
    type: AccountType.INDIVIDUAL,
    name: "Victim",
    identity_id: "ory-identity-victim",
    disabled: false,
    flags: [],
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    metadata_public: {},
    metadata_private: {},
    ...overrides,
  } as Account;
}

/**
 * A stand-in for DynamoDB that honours `PutItem`'s conditional-write semantics
 * the way the real service does:
 *
 *   - with no `ConditionExpression`, a Put at an existing partition key
 *     **replaces** the stored item;
 *   - with `attribute_not_exists(account_id)`, a Put at an existing key fails
 *     with `ConditionalCheckFailedException` and the store is untouched.
 *
 * Asserting on the command's shape would only prove we passed a string. This
 * models the behaviour that actually protects the row, so the test fails for
 * the same reason production is exposed.
 */
function fakeDynamo(seed: Account[] = []) {
  const store = new Map<string, Account>(
    seed.map((account) => [account.account_id, account])
  );

  const send = jest.fn(async (command: { input: Record<string, unknown> }) => {
    const item = command.input.Item as Account | undefined;
    if (!item) {
      const key = command.input.Key as { account_id: string } | undefined;
      if (key) store.delete(key.account_id);
      return {};
    }

    const condition = command.input.ConditionExpression as string | undefined;
    const guardsExistence =
      typeof condition === "string" &&
      condition.replace(/\s/g, "").includes("attribute_not_exists(account_id)");

    if (guardsExistence && store.has(item.account_id)) {
      const error = new Error(
        "The conditional request failed"
      ) as Error & { name: string };
      error.name = "ConditionalCheckFailedException";
      throw error;
    }

    store.set(item.account_id, item);
    return {};
  });

  return {
    store,
    client: { send } as unknown as DynamoDBDocumentClient,
  };
}

/**
 * A bindings table whose store keys on the (issuer, subject) pair and honours
 * `attribute_not_exists(issuer)` the way the real table does.
 */
function fakeBindings(seed: Array<{ issuer: string; subject: string }> = []) {
  const store = new Set(seed.map((b) => `${b.issuer}\u0000${b.subject}`));
  const send = jest.fn(async (command: { input: Record<string, unknown> }) => {
    const item = command.input.Item as { issuer: string; subject: string };
    const key = `${item.issuer}\u0000${item.subject}`;
    if (store.has(key)) {
      const error = new Error("The conditional request failed") as Error & {
        name: string;
      };
      error.name = "ConditionalCheckFailedException";
      throw error;
    }
    store.add(key);
    return {};
  });
  const table = new IdentityBindingsTable({
    client: { send } as unknown as DynamoDBDocumentClient,
    memoizedRead: createMemoizedRead(fakeReactCache),
  });
  return { store, table };
}

describe("AccountsTable.create", () => {
  it("refuses to overwrite an account that already exists", async () => {
    // The victim already holds `victim`, bound to their Ory identity.
    const victim = makeAccount();
    const { store, client } = fakeDynamo([victim]);
    const table = new AccountsTable({ client, bindings: fakeBindings().table });

    // An attacker who has registered an Ory identity but not yet created an
    // account submits the create form naming the victim's account_id. This is
    // reachable today: `isAuthorized(..., Actions.CreateAccount)` returns true
    // for precisely this state (no account yet), and `account_id` comes
    // straight off the form.
    const attacker = makeAccount({
      name: "Attacker",
      identity_id: "ory-identity-attacker",
    });

    await expect(table.create(attacker)).rejects.toThrow(
      expect.objectContaining({ name: "ConditionalCheckFailedException" })
    );

    // The row must still belong to the victim. Without the conditional write
    // the Put silently replaces it, the account and every product beneath it
    // transfer to the attacker's identity, and the victim is locked out.
    expect(store.get("victim")?.identity_id).toBe("ory-identity-victim");
    expect(store.get("victim")?.name).toBe("Victim");
  });

  it("still creates an account when the id is unused", async () => {
    const { store, client } = fakeDynamo([makeAccount()]);
    const bindings = fakeBindings();
    const table = new AccountsTable({ client, bindings: bindings.table });

    const newcomer = makeAccount({
      account_id: "newcomer",
      name: "Newcomer",
      identity_id: "ory-identity-newcomer",
    });

    await expect(table.create(newcomer)).resolves.toEqual(newcomer);
    expect(store.get("newcomer")?.identity_id).toBe("ory-identity-newcomer");
    expect(store.size).toBe(2);
    // ...and binds the Ory identity under this environment's issuer.
    expect(bindings.store.has("http://ory.test\u0000ory-identity-newcomer")).toBe(true);
  });

  it("does not leave an account behind when its identity is already bound", async () => {
    // The identity already resolves to some other account. A second account for
    // it must not be created half-way: the row is written, the binding fails,
    // and the row is removed again.
    const { store, client } = fakeDynamo([makeAccount()]);
    const bindings = fakeBindings([
      { issuer: "http://ory.test", subject: "ory-identity-victim" },
    ]);
    const table = new AccountsTable({ client, bindings: bindings.table });

    const second = makeAccount({ account_id: "second", name: "Second" });

    await expect(table.create(second)).rejects.toThrow(
      expect.objectContaining({ name: "ConditionalCheckFailedException" })
    );
    expect(store.has("second")).toBe(false);
  });
});
