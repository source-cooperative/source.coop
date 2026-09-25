/** @jest-environment node */
import { NextRequest } from "next/server";
import { productsTable } from "@/lib/clients/database/products";
import { apiKeysTable } from "@/lib/clients/database/api-keys";
import { getApiSession } from "@/lib/api/utils";
import { isAuthorized } from "@/lib/api/authz";
import { LEGACY_API_KEY_DEPRECATION } from "@/lib/api/legacy-api-keys";
import { GET, POST } from "./route";

jest.mock("@/lib/clients/database/products", () => ({
  productsTable: { fetchById: jest.fn() },
}));
jest.mock("@/lib/clients/database/api-keys", () => ({
  apiKeysTable: { listByAccount: jest.fn() },
}));
jest.mock("@/lib/api/utils", () => ({ getApiSession: jest.fn() }));
jest.mock("@/lib/api/authz", () => ({ isAuthorized: jest.fn() }));

const params = { params: { account_id: "acme", repository_id: "data" } };
const key = {
  access_key_id: "SCACMEDATA",
  account_id: "acme",
  repository_id: "data",
  name: "Nightly sync",
  expires: "2030-01-01T00:00:00.000Z",
  disabled: false,
  secret_access_key: "x".repeat(64),
};

describe("POST /api/v1/products/[account_id]/[repository_id]/api-keys", () => {
  test("answers 410, whoever asks, and points to service account keys", async () => {
    const res = POST();
    expect(res.status).toBe(410);
    await expect(res.json()).resolves.toEqual({
      error: expect.stringContaining("service account"),
    });
    expect(getApiSession).not.toHaveBeenCalled();
  });
});

describe("GET /api/v1/products/[account_id]/[repository_id]/api-keys", () => {
  test("lists the product's keys without their secrets, marked deprecated", async () => {
    (productsTable.fetchById as jest.Mock).mockResolvedValue({
      account_id: "acme",
      product_id: "data",
    });
    (isAuthorized as jest.Mock).mockReturnValue(true);
    (apiKeysTable.listByAccount as jest.Mock).mockResolvedValue([key]);

    const res = await GET({} as NextRequest, params);

    expect(res.status).toBe(200);
    const { secret_access_key: _, ...redacted } = key;
    await expect(res.json()).resolves.toEqual([redacted]);
    expect(apiKeysTable.listByAccount).toHaveBeenCalledWith("acme", "data");
    expect(res.headers.get("Deprecation")).toBe(
      LEGACY_API_KEY_DEPRECATION.Deprecation
    );
    expect(res.headers.get("Sunset")).toBe(LEGACY_API_KEY_DEPRECATION.Sunset);
  });
});
