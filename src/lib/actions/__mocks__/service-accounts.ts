import { fn } from "storybook/test";
import type * as Real from "../service-accounts";
import {
  apiKeyChecksum,
  type ServiceAccountActionState,
  type ServiceAccountFormState,
} from "@/types";

/**
 * Storybook stand-in for the service-account server actions, redirected to by
 * `sb.mock()` in `.storybook/preview.tsx`. The real module is `"use server"`
 * and brings the AWS SDK with it, so nothing that imports it can render in a
 * browser bundle without this.
 *
 * The real `createServiceAccount` ends in a redirect to the new account's
 * page, which Storybook cannot follow, so this one resolves as though it
 * succeeded — with a key of the real shape when the form asked for one, as the
 * real one returns in place of redirecting. The key is assembled at run time
 * so that secret scanners don't flag this file. `addGithubTrust` succeeds, so its dialog closes as it does in the
 * app. The rest resolve to an idle state.
 */
const idle = (): ServiceAccountActionState => ({ message: "", success: false });

const FIXTURE_BODY = "storyFixtureNotARealKey1234567";

export const createServiceAccount: typeof Real.createServiceAccount = fn(
  async (_prev, formData): Promise<ServiceAccountFormState> => ({
    fieldErrors: {},
    message: "",
    success: true,
    ...(formData.has("key_label") && {
      issued: {
        key: `sck_${FIXTURE_BODY}${apiKeyChecksum(FIXTURE_BODY)}`,
        account_url: "#",
        record: {
          key_id: "6f1c2a3b-4d5e-4f60-8a9b-0c1d2e3f4a5b",
          account_id: `${formData.get("owner_account_id")}--${formData.get("local_id")}`,
          label: String(formData.get("key_label") || "CI"),
          hint: apiKeyChecksum(FIXTURE_BODY),
          created_at: "2026-03-12T00:00:00Z",
          created_by: "acoltrane",
          expires_at: null,
        },
      },
    }),
  })
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
// Takes a moment, as a real save does, so the choice shows while it is in
// flight. Nothing is saved and no page revalidates, so it then springs back.
export const setProductAccess: typeof Real.setProductAccess = fn(
  async (): Promise<ServiceAccountActionState> => {
    await new Promise((resolve) => setTimeout(resolve, 800));
    return { message: "", success: true };
  }
).mockName("setProductAccess");
