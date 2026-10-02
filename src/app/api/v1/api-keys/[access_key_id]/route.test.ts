/** @jest-environment node */
import { NextRequest } from "next/server";
import { apiKeysTable } from "@/lib/clients/database/api-keys";
import { getApiSession } from "@/lib/api/utils";
import { isAuthorized } from "@/lib/api/authz";
import { LEGACY_API_KEY_DEPRECATION } from "@/lib/api/legacy-api-keys";
import { Actions } from "@/types";
import { DELETE } from "./route";

jest.mock("@/lib/clients/database/api-keys", () => ({
  apiKeysTable: { fetchById: jest.fn(), delete: jest.fn() },
}));
jest.mock("@/lib/api/utils", () => ({ getApiSession: jest.fn() }));
jest.mock("@/lib/api/authz", () => ({ isAuthorized: jest.fn() }));

const session = { account: { account_id: "regular-user" } };
const key = {
  access_key_id: "SCREGULARUSER",
  account_id: "regular-user",
  name: "Laptop",
  expires: "2030-01-01T00:00:00.000Z",
  disabled: false,
  secret_access_key: "x".repeat(64),
};
const del = () =>
  DELETE({} as NextRequest, { params: { access_key_id: "SCREGULARUSER" } });

describe("DELETE /api/v1/api-keys/[access_key_id]", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (getApiSession as jest.Mock).mockResolvedValue(session);
    (apiKeysTable.fetchById as jest.Mock).mockResolvedValue(key);
    (isAuthorized as jest.Mock).mockReturnValue(true);
  });

  test("deletes the key, marked deprecated", async () => {
    const res = await del();

    expect(res.status).toBe(200);
    expect(isAuthorized).toHaveBeenCalledWith(
      session,
      key,
      Actions.RevokeAPIKey
    );
    expect(apiKeysTable.delete).toHaveBeenCalledWith("SCREGULARUSER");
    expect(res.headers.get("Deprecation")).toBe(
      LEGACY_API_KEY_DEPRECATION.Deprecation
    );
    expect(res.headers.get("Sunset")).toBe(LEGACY_API_KEY_DEPRECATION.Sunset);
  });

  test("deletes nothing for a caller who may not revoke the key", async () => {
    (isAuthorized as jest.Mock).mockReturnValue(false);
    expect((await del()).status).toBe(401);
    expect(apiKeysTable.delete).not.toHaveBeenCalled();
  });

  test("is 404 for a key that does not exist", async () => {
    (apiKeysTable.fetchById as jest.Mock).mockResolvedValue(null);
    expect((await del()).status).toBe(404);
    expect(apiKeysTable.delete).not.toHaveBeenCalled();
  });

  test("does not claim success when the delete fails", async () => {
    (apiKeysTable.delete as jest.Mock).mockRejectedValue(new Error("boom"));
    expect((await del()).status).toBe(500);
  });
});
