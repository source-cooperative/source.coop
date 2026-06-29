/** @jest-environment node */
import { NextRequest } from "next/server";

jest.mock("@ory/client-fetch", () => {
  const toSession = jest.fn();
  class ResponseError extends Error {
    response: unknown;
    constructor(response: unknown) {
      super("ResponseError");
      this.name = "ResponseError";
      this.response = response;
    }
  }
  return {
    ResponseError,
    Configuration: class {},
    FrontendApi: class {
      toSession = toSession;
    },
    __toSession: toSession,
  };
});

jest.mock("next/headers", () => ({
  headers: async () => ({ get: () => "ory_session=stuck" }),
}));
jest.mock("next/navigation", () => ({
  // Mirror next/navigation: redirect() signals via a thrown NEXT_REDIRECT.
  redirect: jest.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

// utils.ts pulls these in at import time; the AAL2 error path short-circuits
// before any of them are touched, so empty stubs are enough.
jest.mock("@/lib/clients/database", () => ({
  accountsTable: { fetchByOryId: jest.fn() },
  membershipsTable: { listByUser: jest.fn() },
  isIndividualAccount: jest.fn(),
}));
jest.mock("@/lib/api/oidc", () => ({ authenticateWithOidcToken: jest.fn() }));

import { ResponseError } from "@ory/client-fetch";
import { redirect } from "next/navigation";
import { getApiSession, getPageSession } from "@/lib/api/utils";

const { __toSession: mockToSession } = jest.requireMock("@ory/client-fetch");

const aal2Error = (status = 403) =>
  new ResponseError({
    status,
    json: async () => ({ error: { id: "session_aal2_required" } }),
  });

afterEach(() => jest.clearAllMocks());

describe("AAL2 step-up handling", () => {
  test("page render signs the user out (redirect /logout)", async () => {
    mockToSession.mockRejectedValue(aal2Error());
    await expect(getPageSession()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/logout");
  });

  test("API path returns null (→ 401), never redirects", async () => {
    mockToSession.mockRejectedValue(aal2Error());
    const req = new NextRequest("http://localhost/api/v1/whoami");
    await expect(getApiSession(req)).resolves.toBeNull();
    expect(redirect).not.toHaveBeenCalled();
  });

  test("plain 401 returns null without redirecting", async () => {
    mockToSession.mockRejectedValue(
      new ResponseError({ status: 401, json: async () => ({}) }),
    );
    await expect(getPageSession()).resolves.toBeNull();
    expect(redirect).not.toHaveBeenCalled();
  });
});
