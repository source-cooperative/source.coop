import { NextApiRequest } from "next";
import httpMocks from "node-mocks-http";
import { handler } from "@/pages/api/v1/accounts/[account_id]/flags";
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
  AccountFlags,
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

describe("/api/v1/accounts/[account_id]/flags", () => {
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

  describe("GET - getAccountFlagsHandler", () => {
    beforeEach(() => {
      req.method = "GET";
    });

    it("should throw UnauthorizedError when user is not authenticated", async () => {
      (getSession as jest.Mock).mockResolvedValue(null);
      (getAccount as jest.Mock).mockResolvedValue({
        account_id: "test-account",
        account_type: AccountType.USER,
        disabled: false,
        profile: {},
        flags: [AccountFlags.ADMIN],
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
        profile: {},
        flags: [AccountFlags.ADMIN],
      });
      (isAuthorized as jest.Mock).mockReturnValue(false);

      await expect(handler(req, res)).rejects.toThrow(UnauthorizedError);
    });

    it("should return account flags when user is authorized", async () => {
      const mockAccount: Account = {
        account_id: "test-account",
        account_type: AccountType.USER,
        disabled: false,
        profile: {},
        flags: [AccountFlags.ADMIN, AccountFlags.CREATE_REPOSITORIES],
      };
      (getSession as jest.Mock).mockResolvedValue({
        identity_id: "authorized-user",
      });
      (getAccount as jest.Mock).mockResolvedValue(mockAccount);
      (isAuthorized as jest.Mock).mockReturnValue(true);

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(jsonBody(res)).toEqual([
        AccountFlags.ADMIN,
        AccountFlags.CREATE_REPOSITORIES,
      ]);
      expect(isAuthorized).toHaveBeenCalledWith(
        expect.anything(),
        mockAccount,
        Actions.GetAccountFlags
      );
    });
  });

  describe("PUT - putAccountFlagsHandler", () => {
    beforeEach(() => {
      req.method = "PUT";
      req.body = []; // Initialize with an empty array
    });

    it("should throw UnauthorizedError when user is not authenticated", async () => {
      (getSession as jest.Mock).mockResolvedValue(null);
      (isAuthorized as jest.Mock).mockReturnValue(false);

      await expect(handler(req, res)).rejects.toThrow(UnauthorizedError);
    });

    it("should throw NotFoundError when account doesn't exist", async () => {
      (getSession as jest.Mock).mockResolvedValue({ identity_id: "user-1" });
      (getAccount as jest.Mock).mockResolvedValue(null);
      req.body = [AccountFlags.ADMIN]; // Set a valid flag array

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
        profile: {},
        flags: [AccountFlags.ADMIN],
      });
      (isAuthorized as jest.Mock).mockReturnValue(false);

      req.body = [AccountFlags.CREATE_REPOSITORIES];

      await expect(handler(req, res)).rejects.toThrow(UnauthorizedError);
    });

    it("should update account flags when user is authorized", async () => {
      const mockAccount: Account = {
        account_id: "test-account",
        account_type: AccountType.USER,
        disabled: false,
        profile: {},
        flags: [AccountFlags.ADMIN],
      };
      const updatedAccount: Account = {
        ...mockAccount,
        flags: [AccountFlags.ADMIN, AccountFlags.CREATE_REPOSITORIES],
      };
      (getSession as jest.Mock).mockResolvedValue({
        identity_id: "authorized-user",
      });
      (getAccount as jest.Mock).mockResolvedValue(mockAccount);
      (isAuthorized as jest.Mock).mockReturnValue(true);
      (putAccount as jest.Mock).mockResolvedValue([updatedAccount, true]);

      req.body = [AccountFlags.ADMIN, AccountFlags.CREATE_REPOSITORIES];

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(jsonBody(res)).toEqual([
        AccountFlags.ADMIN,
        AccountFlags.CREATE_REPOSITORIES,
      ]);
      expect(isAuthorized).toHaveBeenCalledWith(
        expect.anything(),
        mockAccount,
        Actions.PutAccountFlags
      );
      expect(putAccount).toHaveBeenCalledWith(updatedAccount);
    });

    it("should handle empty array of flags", async () => {
      const mockAccount: Account = {
        account_id: "test-account",
        account_type: AccountType.USER,
        disabled: false,
        profile: {},
        flags: [AccountFlags.ADMIN],
      };
      const updatedAccount: Account = {
        ...mockAccount,
        flags: [],
      };
      (getSession as jest.Mock).mockResolvedValue({
        identity_id: "authorized-user",
      });
      (getAccount as jest.Mock).mockResolvedValue(mockAccount);
      (isAuthorized as jest.Mock).mockReturnValue(true);
      (putAccount as jest.Mock).mockResolvedValue([updatedAccount, true]);

      req.body = [];

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(jsonBody(res)).toEqual([]);
      expect(putAccount).toHaveBeenCalledWith(updatedAccount);
    });

    it("should throw an error for invalid flag data", async () => {
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

      req.body = ["INVALID_FLAG"];

      await expect(handler(req, res)).rejects.toThrow();
    });
  });
});
