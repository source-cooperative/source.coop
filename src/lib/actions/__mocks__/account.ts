import { fn } from "storybook/test";
import type * as Real from "../account";
import type { FormState } from "@/components/core/DynamicForm";
import type { AccountSuggestion } from "@/lib/clients/database/accounts";
import { AccountType } from "@/types";

/**
 * Storybook stand-in for the account server actions.
 *
 * Needed even by stories that never touch an account: `@/components/core`
 * re-exports AccountSearchInput, which imports `searchAccounts` from the real
 * module, so anything importing the core barrel pulls the AWS SDK in behind it.
 * That is what kept DataConnectionForm from rendering even after its own
 * actions were mocked.
 *
 * `searchAccounts` returns a fixed pair so the picker's suggestion list has
 * something to draw — the one thing a live Storybook could never show — plus
 * a service account when the search is scoped to `miskatonic`, the way the
 * invite form scopes it to the organization being managed.
 */
const idle = (): FormState<Record<string, unknown>> => ({
  fieldErrors: {},
  data: new FormData(),
  message: "",
  success: false,
});

export const searchAccounts: typeof Real.searchAccounts = fn(
  async (query: string, memberOf?: string): Promise<AccountSuggestion[]> =>
    query.trim().length < 2
      ? []
      : [
          { account_id: "acoltrane", name: "Alice Coltrane", type: AccountType.INDIVIDUAL },
          { account_id: "miskatonic", name: "Miskatonic University", type: AccountType.ORGANIZATION },
          ...(memberOf === "miskatonic"
            ? [{ account_id: "miskatonic-bot", name: "Miskatonic Bot", type: AccountType.SERVICE }]
            : []),
        ]
).mockName("searchAccounts");

export const createAccount: typeof Real.createAccount = fn(async () => idle()).mockName("createAccount");
export const updateAccountProfile: typeof Real.updateAccountProfile = fn(async () => idle()).mockName(
  "updateAccountProfile"
);
export const updateAccountFlags: typeof Real.updateAccountFlags = fn(async () => idle()).mockName(
  "updateAccountFlags"
);
