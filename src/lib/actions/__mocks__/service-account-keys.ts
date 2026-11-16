import { fn } from "storybook/test";
import type * as Real from "../service-account-keys";
import { apiKeyChecksum, type ApiKeyActionState } from "@/types";

/**
 * Storybook stand-in for the API-key server actions, redirected to by
 * `sb.mock()` in `.storybook/preview.tsx`. `issueApiKey` resolves with a key
 * of the real shape, so the show-once view is reachable by submitting the
 * dialog. The key is assembled at run time so that secret scanners don't flag
 * this file.
 */
const idle = (): ApiKeyActionState => ({ message: "", success: false });
const FIXTURE_BODY = "storyFixtureNotARealKey1234567";

export const issueApiKey: typeof Real.issueApiKey = fn(
  async (_prev, formData): Promise<ApiKeyActionState> => ({
    message: "",
    success: true,
    issued: {
      key: `sck_${FIXTURE_BODY}${apiKeyChecksum(FIXTURE_BODY)}`,
      record: {
        key_id: "6f1c2a3b-4d5e-4f60-8a9b-0c1d2e3f4a5b",
        account_id: "nightly-sync",
        label: String(formData.get("label") || "CI"),
        hint: apiKeyChecksum(FIXTURE_BODY),
        created_at: "2026-03-12T00:00:00Z",
        created_by: "acoltrane",
        expires_at: null,
      },
    },
  })
).mockName("issueApiKey");
export const revokeApiKey: typeof Real.revokeApiKey = fn(async () => idle()).mockName("revokeApiKey");
export const setApiKeyExpiry: typeof Real.setApiKeyExpiry = fn(async () => idle()).mockName(
  "setApiKeyExpiry"
);
