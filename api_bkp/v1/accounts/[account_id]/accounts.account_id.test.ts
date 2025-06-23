import { NextApiRequest } from "next";
import httpMocks from "node-mocks-http";
import { handler } from "@/pages/api/v1/accounts/[account_id]";
import { getSession } from "@/api/utils";
import { isAuthorized } from "@/api/authz";
import { getAccount, putAccount } from "@/api/db";
import { UnauthorizedError, NotFoundError } from "@/api/errors";
import { MockNextApiResponse, jsonBody } from "@/api/utils/mock";
import { AccountType, UserSession, Account, Actions } from "@/api/types";
import logger from "@/utils/logger";

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

describe("/api/v1/accounts/[account_id]", () => {
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

  describe("GET - getAccountHandler", () => {
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
        flags: [],
      });

      await expect(handler(req, res)).rejects.toThrow(UnauthorizedError);
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
      (isAuthorized as jest.Mock).mockReturnValue(false);
      (getAccount as jest.Mock).mockResolvedValue({
        account_id: "test-account",
        account_type: AccountType.USER,
        disabled: false,
        profile: {},
        flags: [],
      });

      await expect(handler(req, res)).rejects.toThrow(UnauthorizedError);
    });

    it("should fetch account successfully when user is authorized", async () => {
      const mockSession: UserSession = {
        identity_id: "authorized-user",
        account: {
          account_id: "authorized-account",
          account_type: AccountType.USER,
          disabled: false,
          profile: {},
          flags: [],
        },
      };
      const mockAccount: Account = {
        account_id: "test-account",
        account_type: AccountType.USER,
        disabled: false,
        profile: { name: "Test Account" },
        flags: [],
      };
      (getSession as jest.Mock).mockResolvedValue(mockSession);
      (isAuthorized as jest.Mock).mockReturnValue(true);
      (getAccount as jest.Mock).mockResolvedValue(mockAccount);

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(jsonBody(res)).toEqual(mockAccount);
      expect(isAuthorized).toHaveBeenCalledWith(
        mockSession,
        mockAccount,
        Actions.GetAccount
      );
    });

    it("should throw NotFoundError when account doesn't exist", async () => {
      const mockSession: UserSession = {
        identity_id: "authorized-user",
        account: {
          account_id: "authorized-account",
          account_type: AccountType.USER,
          disabled: false,
          profile: {},
          flags: [],
        },
      };
      (getSession as jest.Mock).mockResolvedValue(mockSession);
      (getAccount as jest.Mock).mockResolvedValue(null);

      await expect(handler(req, res)).rejects.toThrow(NotFoundError);
    });
  });

  describe("DELETE - deleteAccountHandler", () => {
    beforeEach(() => {
      req.method = "DELETE";
    });

    it("should throw UnauthorizedError when user is not authenticated", async () => {
      (getSession as jest.Mock).mockResolvedValue(null);
      (isAuthorized as jest.Mock).mockReturnValue(false);
      (getAccount as jest.Mock).mockResolvedValue({
        account_id: "test-account",
        account_type: AccountType.USER,
        disabled: false,
        profile: {},
        flags: [],
      });

      await expect(handler(req, res)).rejects.toThrow(UnauthorizedError);
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
      (isAuthorized as jest.Mock).mockReturnValue(false);
      (getAccount as jest.Mock).mockResolvedValue({
        account_id: "test-account",
        account_type: AccountType.USER,
        disabled: false,
        profile: {},
        flags: [],
      });

      await expect(handler(req, res)).rejects.toThrow(UnauthorizedError);
    });

    it("should disable account successfully when user is authorized", async () => {
      const mockSession: UserSession = {
        identity_id: "authorized-user",
        account: {
          account_id: "authorized-account",
          account_type: AccountType.USER,
          disabled: false,
          profile: {},
          flags: [],
        },
      };
      const mockAccount: Account = {
        account_id: "test-account",
        account_type: AccountType.USER,
        disabled: false,
        profile: { name: "Test Account" },
        flags: [],
      };
      const disabledAccount: Account = { ...mockAccount, disabled: true };
      (getSession as jest.Mock).mockResolvedValue(mockSession);
      (isAuthorized as jest.Mock).mockReturnValue(true);
      (getAccount as jest.Mock).mockResolvedValue(mockAccount);
      (putAccount as jest.Mock).mockResolvedValue([disabledAccount, true]);

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(jsonBody(res)).toEqual(disabledAccount);
      expect(isAuthorized).toHaveBeenCalledWith(
        mockSession,
        mockAccount,
        Actions.DisableAccount
      );
      expect(putAccount).toHaveBeenCalledWith(
        expect.objectContaining({ disabled: true })
      );
    });

    it("should throw NotFoundError when account doesn't exist", async () => {
      const mockSession: UserSession = {
        identity_id: "authorized-user",
        account: {
          account_id: "authorized-account",
          account_type: AccountType.USER,
          disabled: false,
          profile: {},
          flags: [],
        },
      };
      (getSession as jest.Mock).mockResolvedValue(mockSession);
      (getAccount as jest.Mock).mockResolvedValue(null);

      await expect(handler(req, res)).rejects.toThrow(NotFoundError);
    });
  });
});
