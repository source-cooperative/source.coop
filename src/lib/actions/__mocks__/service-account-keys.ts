import { fn } from "storybook/test";
import type * as Real from "../service-account-keys";
import type { ApiKeyActionState } from "@/types";

/**
 * Storybook stand-in for the API-key server actions, redirected to by
 * `sb.mock()` in `.storybook/preview.tsx`. `issueApiKey` resolves as though a
 * key were signed, so the show-once view is reachable by submitting the dialog.
 */
const idle = (): ApiKeyActionState => ({ message: "", success: false });

export const issueApiKey: typeof Real.issueApiKey = fn(
  async (_prev, formData): Promise<ApiKeyActionState> => ({
    message: "",
    success: true,
    issued: {
      key: "sck_eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImsxIn0.eyJpc3MiOiJodHRwczovL2RhdGEuc291cmNlLmNvb3AiLCJzdWIiOiJuaWdodGx5LXN5bmMiLCJqdGkiOiIxIiwidHlwZSI6ImFwaV9rZXkifQ.signature",
      record: {
        jti: "6f1c2a3b-4d5e-4f60-8a9b-0c1d2e3f4a5b",
        account_id: "nightly-sync",
        label: String(formData.get("label") || "CI"),
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
