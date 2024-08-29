import { NextApiRequest } from "next";
import httpMocks from "node-mocks-http";
import { handler } from "@/pages/api/v1/accounts/[account_id]/profile";
import { getSession } from "@/api/utils";
import { isAuthorized } from "@/api/authz";
import { getAccount, putAccount } from "@/api/db";
import {
  UnauthorizedError,
  NotFoundError,
  MethodNotImplementedError,
} from "@/api/errors";
import { MockNextApiResponse, jsonBody } from "@/api/utils/mock";
import {
  AccountType,
  UserSession,
  Account,
  AccountProfile,
  Actions,
} from "@/api/types";

jest.mock("@/api/utils", () => ({
  getSession: jest.fn(),
}));

jest.mock("@/api/authz", () => ({
  isAuthorized: jest.fn(),
}));

jest.mock("@/api/db", () => ({
  getAccount: jest.fn(),
  putAccount: jest.fn(),
}));

describe("/api/v1/accounts/[account_id]/profile", () => {
  let req: NextApiRequest;
  let res: MockNextApiResponse;

  beforeEach(() => {
    req = httpMocks.createRequest();
    res = httpMocks.createResponse() as MockNextApiResponse;
    req.query = { account_id: "test-account" };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("GET - getAccountProfileHandler", () => {
    beforeEach(() => {
      req.method = "GET";
    });

    it("should throw UnauthorizedError when user is not authenticated", async () => {
      (getSession as jest.Mock).mockResolvedValue(null);
      (getAccount as jest.Mock).mockResolvedValue({
        account_id: "test-account",
        account_type: AccountType.USER,
        disabled: false,
        profile: { name: "Test User" },
        flags: [],
      });
      (isAuthorized as jest.Mock).mockReturnValue(false);

      await expect(handler(req, res)).rejects.toThrow(UnauthorizedError);
    });

    it("should throw NotFoundError when account doesn't exist", async () => {
      (getSession as jest.Mock).mockResolvedValue({ identity_id: "user-1" });
      (getAccount as jest.Mock).mockResolvedValue(null);

      await expect(handler(req, res)).rejects.toThrow(NotFoundError);
    });

    it("should throw UnauthorizedError when user is not authorized", async () => {
      const mockSession: UserSession = {
        identity_id: "unauthorized-user",
        account: {
          account_id: "unauthorized-account",
          account_type: AccountType.USER,
          disabled: false,
          profile: {},
          flags: [],
        },
      };
      (getSession as jest.Mock).mockResolvedValue(mockSession);
      (getAccount as jest.Mock).mockResolvedValue({
        account_id: "test-account",
        account_type: AccountType.USER,
        disabled: false,
        profile: { name: "Test User" },
        flags: [],
      });
      (isAuthorized as jest.Mock).mockReturnValue(false);

      await expect(handler(req, res)).rejects.toThrow(UnauthorizedError);
    });

    it("should return account profile when user is authorized", async () => {
      const mockProfile: AccountProfile = {
        name: "Test User",
        bio: "Test bio",
        location: "Test Location",
        url: "https://test.com",
      };
      const mockAccount: Account = {
        account_id: "test-account",
        account_type: AccountType.USER,
        disabled: false,
        profile: mockProfile,
        flags: [],
      };
      (getSession as jest.Mock).mockResolvedValue({
        identity_id: "authorized-user",
      });
      (getAccount as jest.Mock).mockResolvedValue(mockAccount);
      (isAuthorized as jest.Mock).mockReturnValue(true);

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(jsonBody(res)).toEqual(mockProfile);
      expect(isAuthorized).toHaveBeenCalledWith(
        expect.anything(),
        mockAccount,
        Actions.GetAccountProfile
      );
    });
  });

  describe("PUT - putAccountProfileHandler", () => {
    beforeEach(() => {
      req.method = "PUT";
    });

    it("should throw UnauthorizedError when user is not authenticated", async () => {
      (getSession as jest.Mock).mockResolvedValue(null);
      (getAccount as jest.Mock).mockResolvedValue({
        account_id: "test-account",
        account_type: AccountType.USER,
        disabled: false,
        profile: { name: "Test User" },
        flags: [],
      });
      (isAuthorized as jest.Mock).mockReturnValue(false);

      await expect(handler(req, res)).rejects.toThrow(UnauthorizedError);
    });

    it("should throw NotFoundError when account doesn't exist", async () => {
      (getSession as jest.Mock).mockResolvedValue({ identity_id: "user-1" });
      (getAccount as jest.Mock).mockResolvedValue(null);
      req.body = { name: "Updated Name" };

      await expect(handler(req, res)).rejects.toThrow(NotFoundError);
    });

    it("should throw UnauthorizedError when user is not authorized", async () => {
      const mockSession: UserSession = {
        identity_id: "unauthorized-user",
        account: {
          account_id: "unauthorized-account",
          account_type: AccountType.USER,
          disabled: false,
          profile: {},
          flags: [],
        },
      };
      (getSession as jest.Mock).mockResolvedValue(mockSession);
      (getAccount as jest.Mock).mockResolvedValue({
        account_id: "test-account",
        account_type: AccountType.USER,
        disabled: false,
        profile: { name: "Test User" },
        flags: [],
      });
      (isAuthorized as jest.Mock).mockReturnValue(false);

      req.body = { name: "Updated Name" };

      await expect(handler(req, res)).rejects.toThrow(UnauthorizedError);
    });

    it("should update account profile when user is authorized", async () => {
      const initialProfile: AccountProfile = {
        name: "Test User",
        bio: "Initial bio",
      };
      const updatedProfile: AccountProfile = {
        name: "Updated User",
        bio: "Updated bio",
        location: "New Location",
      };
      const mockAccount: Account = {
        account_id: "test-account",
        account_type: AccountType.USER,
        disabled: false,
        profile: initialProfile,
        flags: [],
      };
      const updatedAccount: Account = {
        ...mockAccount,
        profile: updatedProfile,
      };
      (getSession as jest.Mock).mockResolvedValue({
        identity_id: "authorized-user",
      });
      (getAccount as jest.Mock).mockResolvedValue(mockAccount);
      (isAuthorized as jest.Mock).mockReturnValue(true);
      (putAccount as jest.Mock).mockResolvedValue([updatedAccount, true]);

      req.body = updatedProfile;

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(jsonBody(res)).toEqual(updatedProfile);
      expect(isAuthorized).toHaveBeenCalledWith(
        expect.anything(),
        mockAccount,
        Actions.PutAccountProfile
      );
      expect(putAccount).toHaveBeenCalledWith(updatedAccount);
    });

    it("should throw an error for invalid profile data", async () => {
      (getSession as jest.Mock).mockResolvedValue({
        identity_id: "authorized-user",
      });
      (getAccount as jest.Mock).mockResolvedValue({
        account_id: "test-account",
        account_type: AccountType.USER,
        disabled: false,
        profile: {},
        flags: [],
      });
      (isAuthorized as jest.Mock).mockReturnValue(true);

      req.body = { name: 123 }; // Invalid type for name

      await expect(handler(req, res)).rejects.toThrow();
    });
  });

  it("should throw MethodNotImplementedError for unsupported HTTP methods", async () => {
    req.method = "POST";

    await expect(handler(req, res)).rejects.toThrow(MethodNotImplementedError);
  });
});
