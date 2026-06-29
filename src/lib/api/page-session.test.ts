/** @jest-environment node */
jest.mock("server-only", () => ({}));

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

jest.mock("next/headers", () => ({ headers: jest.fn() }));
jest.mock("next/navigation", () => ({
  // Mirror next/navigation: redirect() signals via a thrown NEXT_REDIRECT.
  redirect: jest.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

import { ResponseError } from "@ory/client-fetch";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { redirectIfStepUpRequired } from "@/lib/api/page-session";

const { __toSession: mockToSession } = jest.requireMock("@ory/client-fetch");
const mockHeaders = headers as jest.Mock;

const aal2Error = (status = 403) =>
  new ResponseError({
    status,
    json: async () => ({ error: { id: "session_aal2_required" } }),
  });

beforeEach(() => {
  mockHeaders.mockResolvedValue({ get: () => "ory_session_abc=1" });
});
afterEach(() => jest.clearAllMocks());

describe("redirectIfStepUpRequired", () => {
  test("signs the user out on session_aal2_required", async () => {
    mockToSession.mockRejectedValue(aal2Error());
    await expect(redirectIfStepUpRequired()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/logout");
  });

  test("does nothing for a valid session", async () => {
    mockToSession.mockResolvedValue({ identity: { id: "u" } });
    await redirectIfStepUpRequired();
    expect(redirect).not.toHaveBeenCalled();
  });

  test("does nothing on a plain 401", async () => {
    mockToSession.mockRejectedValue(
      new ResponseError({ status: 401, json: async () => ({}) }),
    );
    await redirectIfStepUpRequired();
    expect(redirect).not.toHaveBeenCalled();
  });

  test("skips the whoami when no Ory session cookie is present", async () => {
    mockHeaders.mockResolvedValue({ get: () => "theme=dark" });
    await redirectIfStepUpRequired();
    expect(mockToSession).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });
});
