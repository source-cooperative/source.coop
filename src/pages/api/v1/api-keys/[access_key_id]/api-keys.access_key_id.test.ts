import { NextApiRequest } from "next";
import httpMocks from "node-mocks-http";
import { handler } from "@/pages/api/v1/api-keys/[access_key_id]";
import { getSession } from "@/api/utils";
import { isAuthorized } from "@/api/authz";
import { getAPIKey, putAPIKey } from "@/api/db";
import { UnauthorizedError, MethodNotImplementedError } from "@/api/errors";
import { MockNextApiResponse, jsonBody } from "@/api/utils/mock";
import { AccountType, UserSession, APIKey, Actions } from "@/api/types";

jest.mock("@/api/utils", () => ({
  getSession: jest.fn(),
}));

jest.mock("@/api/authz", () => ({
  isAuthorized: jest.fn(),
}));

jest.mock("@/api/db", () => ({
  getAPIKey: jest.fn(),
  putAPIKey: jest.fn(),
}));

describe("/api/v1/api-keys/[access_key_id]", () => {
  let req: NextApiRequest;
  let res: MockNextApiResponse;

  beforeEach(() => {
    req = httpMocks.createRequest();
    res = httpMocks.createResponse() as MockNextApiResponse;
    req.query = { access_key_id: "SCACCESSKEY1" };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("DELETE - revokeAPIKeyHandler", () => {
    beforeEach(() => {
      req.method = "DELETE";
    });

    it("should throw UnauthorizedError when API key is not found", async () => {
      (getSession as jest.Mock).mockResolvedValue({ identity_id: "user-1" });
      (getAPIKey as jest.Mock).mockResolvedValue(null);

      await expect(handler(req, res)).rejects.toThrow(UnauthorizedError);
    });

    it("should throw UnauthorizedError when user is not authorized to revoke the API key", async () => {
      const mockAPIKey: APIKey = {
        name: "Test API Key",
        expires: new Date(Date.now() + 86400000).toISOString(),
        account_id: "test-account",
        disabled: false,
        access_key_id: "SCACCESSKEY1",
        secret_access_key:
          "A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8S9t0U1v2W3x4Y5z6A7B8C9D00000",
      };
      (getSession as jest.Mock).mockResolvedValue({
        identity_id: "unauthorized-user",
      });
      (getAPIKey as jest.Mock).mockResolvedValue(mockAPIKey);
      (isAuthorized as jest.Mock).mockReturnValue(false);

      await expect(handler(req, res)).rejects.toThrow(UnauthorizedError);
    });

    it("should revoke API key when user is authorized", async () => {
      const mockAPIKey: APIKey = {
        name: "Test API Key",
        expires: new Date(Date.now() + 86400000).toISOString(),
        account_id: "test-account",
        disabled: false,
        access_key_id: "SCACCESSKEY1",
        secret_access_key:
          "A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8S9t0U1v2W3x4Y5z6A7B8C9D00000",
      };
      const revokedAPIKey: APIKey = { ...mockAPIKey, disabled: true };
      (getSession as jest.Mock).mockResolvedValue({
        identity_id: "authorized-user",
      });
      (getAPIKey as jest.Mock).mockResolvedValue(mockAPIKey);
      (isAuthorized as jest.Mock).mockReturnValue(true);
      (putAPIKey as jest.Mock).mockResolvedValue([revokedAPIKey]);

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(jsonBody(res)).toEqual({
        ...revokedAPIKey,
        secret_access_key: undefined,
      });
      expect(isAuthorized).toHaveBeenCalledWith(
        expect.anything(),
        mockAPIKey,
        Actions.RevokeAPIKey
      );
      expect(putAPIKey).toHaveBeenCalledWith(
        expect.objectContaining({ disabled: true })
      );
    });
  });

  describe("Unsupported methods", () => {
    it("should throw MethodNotImplementedError for unsupported methods", async () => {
      req.method = "GET";
      await expect(handler(req, res)).rejects.toThrow(
        MethodNotImplementedError
      );

      req.method = "POST";
      await expect(handler(req, res)).rejects.toThrow(
        MethodNotImplementedError
      );

      req.method = "PUT";
      await expect(handler(req, res)).rejects.toThrow(
        MethodNotImplementedError
      );
    });
  });
});
