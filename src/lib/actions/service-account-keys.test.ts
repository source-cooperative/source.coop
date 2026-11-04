import { issueApiKey, revokeApiKey, setApiKeyExpiry } from "./service-account-keys";
import { getPageSession } from "../api/utils";
import { issueKey, updateKey } from "@/lib/operations/service-accounts";
import { conflict, notFound, ok } from "@/lib/operations/result";
import type { ApiKeyActionState, UserSession } from "@/types";

jest.mock("../api/utils", () => ({ getPageSession: jest.fn() }));
jest.mock("@/lib/operations/service-accounts", () => ({ issueKey: jest.fn(), updateKey: jest.fn() }));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

const issue = issueKey as jest.Mock;
const update = updateKey as jest.Mock;

const IDLE: ApiKeyActionState = { message: "", success: false };
const session = { identity_id: "ory-alice", account: { account_id: "alice" } } as UserSession;
const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) data.set(k, v);
  return data;
};

beforeEach(() => {
  jest.clearAllMocks();
  (getPageSession as jest.Mock).mockResolvedValue(session);
});

describe("issueApiKey", () => {
  it("turns days into an expiry, and hands back the key apart from its record", async () => {
    issue.mockResolvedValue(ok({ key_id: "k1", key: "sck_x" }));
    const result = await issueApiKey(IDLE, form({ account_id: "acme--sync", label: "HPC", expires_in_days: "90" }));
    expect(issue).toHaveBeenCalledWith(session, "acme--sync", { label: "HPC", expires_at: expect.any(String) });
    expect(result).toEqual({ message: "", success: true, issued: { key: "sck_x", record: { key_id: "k1" } } });
  });

  it("asks for no expiry when none is given", async () => {
    issue.mockResolvedValue(ok({ key_id: "k1", key: "sck_x" }));
    await issueApiKey(IDLE, form({ account_id: "acme--sync", label: "forever", expires_in_days: "" }));
    expect(issue).toHaveBeenCalledWith(session, "acme--sync", { label: "forever", expires_at: null });
  });

  it("refuses days out of range without asking, and passes on the operation's refusal", async () => {
    expect((await issueApiKey(IDLE, form({ account_id: "acme--sync", label: "x", expires_in_days: "0" }))).success).toBe(false);
    expect(issue).not.toHaveBeenCalled();
    issue.mockResolvedValue(conflict("That service account is disabled"));
    expect(await issueApiKey(IDLE, form({ account_id: "acme--sync", label: "x" }))).toEqual({
      message: "That service account is disabled",
      success: false,
    });
  });
});

describe("revokeApiKey and setApiKeyExpiry", () => {
  it("revoke asks for revoked: true on the key named", async () => {
    update.mockResolvedValue(ok({}));
    expect((await revokeApiKey(IDLE, form({ account_id: "acme--sync", key_id: "k1" }))).success).toBe(true);
    expect(update).toHaveBeenCalledWith(session, "acme--sync", "k1", { revoked: true });
    update.mockResolvedValue(notFound("No such key on this service account"));
    expect((await revokeApiKey(IDLE, form({ account_id: "acme--sync", key_id: "k1" }))).success).toBe(false);
  });

  it("expiry turns days into a time, or never", async () => {
    update.mockResolvedValue(ok({}));
    await setApiKeyExpiry(IDLE, form({ account_id: "acme--sync", key_id: "k1", expires_in_days: "30" }));
    expect(update).toHaveBeenLastCalledWith(session, "acme--sync", "k1", { expires_at: expect.any(String) });
    expect((await setApiKeyExpiry(IDLE, form({ account_id: "acme--sync", key_id: "k1", expires_in_days: "" }))).message).toBe(
      "Key no longer expires"
    );
    expect(update).toHaveBeenLastCalledWith(session, "acme--sync", "k1", { expires_at: null });
  });
});
