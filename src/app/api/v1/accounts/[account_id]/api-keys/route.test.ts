// @ts-nocheck
/** @jest-environment node */
import { NextRequest } from "next/server";
import { apiKeysTable } from "@/lib/clients/database";
import {
  getApiSession,
  generateAccessKeyID,
  generateSecretAccessKey,
} from "@/lib/api/utils";
import { isAuthorized } from "@/lib/api/authz";
import { APIKeyRequestSchema, RedactedAPIKeySchema } from "@/types/api-key";

jest.mock("@/lib/clients/database", () => ({
  apiKeysTable: {
    create: jest.fn(),
    listByAccount: jest.fn(),
  },
}));
jest.mock("@/lib/api/utils", () => ({
  getApiSession: jest.fn(),
  generateAccessKeyID: jest.fn(() => "SCFAKEID"),
  generateSecretAccessKey: jest.fn(() => "x".repeat(64)),
}));
jest.mock("@/lib/api/authz", () => ({ isAuthorized: jest.fn() }));

const { GET, POST } = require("./route");

describe("POST /api/v1/accounts/[account_id]/api-keys", () => {
  afterEach(() => jest.resetAllMocks());

  const validBody = {
    name: "Test Key",
    expires: new Date(Date.now() + 100000).toISOString(),
  };

  test("returns 400 if expiration is in the past", async () => {
    const req = {
      json: () =>
        Promise.resolve({
          ...validBody,
          expires: new Date(Date.now() - 1000).toISOString(),
        }),
    } as any;
    const res = await POST(req, { params: { account_id: "foo" } });
    expect(res.status).toBe(400);
  });

  test("returns 404 if account not found", async () => {
    (getApiSession as jest.Mock).mockResolvedValue({});
    const req = { json: () => Promise.resolve(validBody) } as any;
    const res = await POST(req, { params: { account_id: "foo" } });
    expect(res.status).toBe(404);
  });

  test("returns 401 if not authorized", async () => {
    (getApiSession as jest.Mock).mockResolvedValue({
      account: { account_id: "foo" },
    });
    (isAuthorized as jest.Mock).mockReturnValue(false);
    const req = { json: () => Promise.resolve(validBody) } as any;
    const res = await POST(req, { params: { account_id: "foo" } });
    expect(res.status).toBe(401);
  });

  test("returns 200 and created key on success", async () => {
    (getApiSession as jest.Mock).mockResolvedValue({
      account: { account_id: "foo" },
    });
    (isAuthorized as jest.Mock).mockReturnValue(true);
    const createdKey = {
      ...validBody,
      access_key_id: "SCFAKEID",
      secret_access_key: "x".repeat(64),
      account_id: "foo",
      disabled: false,
    };
    (apiKeysTable.create as jest.Mock).mockResolvedValue(createdKey);
    const req = { json: () => Promise.resolve(validBody) } as any;
    const res = await POST(req, { params: { account_id: "foo" } });
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual(createdKey);
  });
});

describe("GET /api/v1/accounts/[account_id]/api-keys", () => {
  afterEach(() => jest.resetAllMocks());

  test("returns 404 if account not found", async () => {
    (getApiSession as jest.Mock).mockResolvedValue({});
    const req = {} as any;
    const res = await GET(req, { params: { account_id: "foo" } });
    expect(res.status).toBe(404);
  });

  test("returns 401 if not authorized to list", async () => {
    (getApiSession as jest.Mock).mockResolvedValue({
      account: { account_id: "foo" },
    });
    (isAuthorized as jest.Mock).mockReturnValueOnce(false);
    const req = {} as any;
    const res = await GET(req, { params: { account_id: "foo" } });
    expect(res.status).toBe(401);
  });

  test("returns 200 and redacted keys on success", async () => {
    (getApiSession as jest.Mock).mockResolvedValue({
      account: { account_id: "foo" },
    });
    (isAuthorized as jest.Mock).mockImplementation(
      (session, obj, action) =>
        action === "account:listAPIKeys" || action === "api_key:get"
    );
    const apiKeys = [
      {
        access_key_id: "SCFAKEID",
        account_id: "foo",
        name: "Test",
        expires: new Date(Date.now() + 100000).toISOString(),
        disabled: false,
        secret_access_key: "x".repeat(64),
      },
    ];
    (apiKeysTable.listByAccount as jest.Mock).mockResolvedValue(apiKeys);
    const req = {} as any;
    const res = await GET(req, { params: { account_id: "foo" } });
    expect(res.status).toBe(200);
    const expected = apiKeys.map((k) => RedactedAPIKeySchema.parse(k));
    await expect(res.json()).resolves.toEqual(expected);
  });
});
