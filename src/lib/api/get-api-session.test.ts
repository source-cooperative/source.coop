/**
 * @jest-environment node
 */

import { NextRequest } from "next/server";

jest.mock("@/lib/config", () => ({
  CONFIG: {
    storage: { endpoint: "https://data.test.source.coop" },
    environment: { isTest: true },
    auth: { accessToken: "", oauth2: { issuer: "https://auth.test.source.coop" } },
  },
}));
jest.mock("@ory/nextjs/app", () => ({ getServerSession: jest.fn() }));
jest.mock("@/lib/clients/database", () => ({
  accountsTable: {},
  membershipsTable: {},
  isIndividualAccount: jest.fn(),
}));
jest.mock("./oidc", () => ({ authenticateWithOidcToken: jest.fn() }));
jest.mock("./ory-access-token", () => ({
  ...jest.requireActual("./ory-access-token"),
  authenticateWithOryAccessToken: jest.fn(),
}));

import { getServerSession } from "@ory/nextjs/app";
import { getApiSession } from "./utils";
import { authenticateWithOidcToken } from "./oidc";
import { authenticateWithOryAccessToken } from "./ory-access-token";

/** An unsigned JWT naming `iss`; routing reads the claim, the verifiers check it. */
const jwt = (iss: string) =>
  ["e30", Buffer.from(JSON.stringify({ iss })).toString("base64url"), "sig"].join(".");

const request = (authorization?: string) =>
  new NextRequest("https://test.source.coop/api/v1/products", {
    headers: authorization ? { Authorization: authorization } : {},
  });

const alice = { account: { account_id: "alice" } };

beforeEach(() => jest.clearAllMocks());

test("an Ory access token goes to the Ory verifier, for this origin", async () => {
  (authenticateWithOryAccessToken as jest.Mock).mockResolvedValue(alice);
  const token = jwt("https://auth.test.source.coop");

  expect(await getApiSession(request(`Bearer ${token}`))).toBe(alice);
  expect(authenticateWithOryAccessToken).toHaveBeenCalledWith(
    token,
    "https://test.source.coop",
  );
  expect(authenticateWithOidcToken).not.toHaveBeenCalled();
});

test("a rejected Ory token falls back to nothing, not the proxy or the cookie", async () => {
  (authenticateWithOryAccessToken as jest.Mock).mockResolvedValue(null);
  const token = jwt("https://auth.test.source.coop/");

  expect(await getApiSession(request(`Bearer ${token}`))).toBeNull();
  expect(authenticateWithOidcToken).not.toHaveBeenCalled();
  expect(getServerSession).not.toHaveBeenCalled();
});

test("a proxy-signed token still goes to the proxy verifier", async () => {
  (authenticateWithOidcToken as jest.Mock).mockResolvedValue(alice);
  const authorization = `Bearer ${jwt("https://data.test.source.coop")}`;

  expect(await getApiSession(request(authorization))).toBe(alice);
  expect(authenticateWithOidcToken).toHaveBeenCalledWith(
    authorization,
    "https://test.source.coop",
  );
  expect(authenticateWithOryAccessToken).not.toHaveBeenCalled();
});
