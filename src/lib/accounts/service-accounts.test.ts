import { managedServiceAccount } from "./service-accounts";
import { accountsTable } from "@/lib/clients";
import { canManageServiceAccount } from "@/lib/api/authz";
import { AccountType, type Account, type UserSession } from "@/types";

jest.mock("@/lib/clients", () => ({ accountsTable: { fetchById: jest.fn() } }));
jest.mock("@/lib/api/authz", () => ({ canManageServiceAccount: jest.fn() }));

const fetchById = accountsTable.fetchById as jest.Mock;
const canManage = canManageServiceAccount as jest.Mock;
const session = { identity_id: "i", account: { account_id: "acme-owner" } } as UserSession;
const org = { account_id: "acme", type: AccountType.ORGANIZATION } as Account;
const bot = { account_id: "nightly-sync", type: AccountType.SERVICE, owner_account_id: "acme" } as Account;
const known: Record<string, Account> = { acme: org, "nightly-sync": bot };

beforeEach(() => {
  jest.clearAllMocks();
  fetchById.mockImplementation(async (id: string) => known[id] ?? null);
  canManage.mockReturnValue(true);
});

test("hands back the service account when its owner is found and managed", async () => {
  expect(await managedServiceAccount(session, "nightly-sync")).toBe(bot);
  expect(canManage).toHaveBeenCalledWith(session, bot, org);
});

test("hands back nothing for a missing account, a person, an orphan, a stranger, or no session", async () => {
  expect(await managedServiceAccount(session, "nobody")).toBeNull();
  expect(await managedServiceAccount(session, "acme")).toBeNull();
  fetchById.mockImplementation(async (id: string) => (id === "nightly-sync" ? bot : null));
  expect(await managedServiceAccount(session, "nightly-sync")).toBeNull();
  fetchById.mockImplementation(async (id: string) => known[id] ?? null);
  canManage.mockReturnValue(false);
  expect(await managedServiceAccount(session, "nightly-sync")).toBeNull();
  canManage.mockReturnValue(true);
  expect(await managedServiceAccount(null, "nightly-sync")).toBeNull();
});
