import { fn } from "storybook/test";
import type * as Real from "../service-accounts";
import type {
  ServiceAccountActionState,
  ServiceAccountFormState,
} from "@/types";

/**
 * Storybook stand-in for the service-account server actions, redirected to by
 * `sb.mock()` in `.storybook/preview.tsx`. The real module is `"use server"`
 * and brings the AWS SDK with it, so nothing that imports it can render in a
 * browser bundle without this.
 *
 * The real `createServiceAccount` ends in a redirect to the new account's
 * page, which Storybook cannot follow, so this one resolves as though it
 * succeeded. `addGithubTrust` succeeds, so its dialog closes as it does in the
 * app. The rest resolve to an idle state.
 */
const idle = (): ServiceAccountActionState => ({ message: "", success: false });

export const createServiceAccount: typeof Real.createServiceAccount = fn(
  async (): Promise<ServiceAccountFormState> => ({ fieldErrors: {}, message: "", success: true })
).mockName("createServiceAccount");

export const addGithubTrust: typeof Real.addGithubTrust = fn(
  async (): Promise<ServiceAccountActionState> => ({ message: "Trusted", success: true })
).mockName("addGithubTrust");

export const removeTrust: typeof Real.removeTrust = fn(async () => idle()).mockName("removeTrust");
export const setServiceAccountDisabled: typeof Real.setServiceAccountDisabled = fn(
  async () => idle()
).mockName("setServiceAccountDisabled");
export const deleteServiceAccount: typeof Real.deleteServiceAccount = fn(async () => idle()).mockName(
  "deleteServiceAccount"
);
export const grantProduct: typeof Real.grantProduct = fn(async () => idle()).mockName("grantProduct");
export const setGrantRole: typeof Real.setGrantRole = fn(async () => idle()).mockName("setGrantRole");
export const revokeGrant: typeof Real.revokeGrant = fn(async () => idle()).mockName("revokeGrant");
