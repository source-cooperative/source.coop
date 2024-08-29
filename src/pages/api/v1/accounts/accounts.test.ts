import { NextApiRequest } from "next";
import httpMocks from "node-mocks-http";
import { handler } from "@/pages/api/v1/accounts";
import { getSession } from "@/api/utils";
import { isAuthorized } from "@/api/authz";
import { putAccount } from "@/api/db";
import { UnauthorizedError, BadRequestError } from "@/api/errors";
import { MockNextApiResponse, jsonBody } from "@/api/utils/mock";
import { AccountType, AccountFlags, UserSession, Account } from "@/api/types";
import { ZodError } from "zod";

jest.mock("@/api/utils", () => ({
  getSession: jest.fn(),
}));

jest.mock("@/api/authz", () => ({
  isAuthorized: jest.fn(),
}));

jest.mock("@/api/db", () => ({
  putAccount: jest.fn(),
}));

describe("/api/v1/accounts", () => {
  let req: NextApiRequest;
  let res: MockNextApiResponse;

  beforeEach(() => {
    req = httpMocks.createRequest();
    res = httpMocks.createResponse() as MockNextApiResponse;
    req.method = "POST";
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should throw UnauthorizedError when user is not signed in", async () => {
    (getSession as jest.Mock).mockResolvedValue(null);

    req.body = {
      account_id: "new-user-account",
      account_type: AccountType.USER,
      profile: {
        name: "New User",
      },
    };

    await expect(handler(req, res)).rejects.toThrow(UnauthorizedError);
  });

  it("should throw UnauthorizedError when user is already associated with an account and tries to create a user account", async () => {
    const mockSession: UserSession = {
      identity_id: "existing-user",
      account: {
        account_id: "existing-account",
        account_type: AccountType.USER,
        disabled: false,
        profile: {},
        flags: [],
      },
    };
    (getSession as jest.Mock).mockResolvedValue(mockSession);
    (isAuthorized as jest.Mock).mockReturnValue(false);

    req.body = {
      account_id: "new-user-account",
      account_type: AccountType.USER,
      profile: {
        name: "New User",
      },
    };

    await expect(handler(req, res)).rejects.toThrow(UnauthorizedError);
  });

  it("should throw UnauthorizedError when user tries to create an account without required permissions", async () => {
    const mockSession: UserSession = {
      identity_id: "user-without-perms",
      account: {
        account_id: "user-account",
        account_type: AccountType.USER,
        disabled: false,
        profile: {},
        flags: [],
      },
    };
    (getSession as jest.Mock).mockResolvedValue(mockSession);
    (isAuthorized as jest.Mock).mockReturnValue(false);

    req.body = {
      account_id: "org-account",
      account_type: AccountType.ORGANIZATION,
      profile: {
        name: "New Org",
      },
    };

    await expect(handler(req, res)).rejects.toThrow(UnauthorizedError);
  });

  it("should create a user account successfully when authorized", async () => {
    const mockSession: UserSession = {
      identity_id: "authorized-user",
    };
    (getSession as jest.Mock).mockResolvedValue(mockSession);
    (isAuthorized as jest.Mock).mockReturnValue(true);

    const newAccount: Account = {
      account_id: "new-user-account",
      account_type: AccountType.USER,
      disabled: false,
      profile: {
        name: "New User",
      },
      flags: [],
      identity_id: "authorized-user",
    };

    (putAccount as jest.Mock).mockResolvedValue([newAccount, true]);

    req.body = {
      account_id: "new-user-account",
      account_type: AccountType.USER,
      profile: {
        name: "New User",
      },
    };

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(jsonBody(res)).toEqual(newAccount);
  });

  it("should create an organization account successfully when authorized", async () => {
    const mockSession: UserSession = {
      identity_id: "authorized-user",
      account: {
        account_id: "user-account",
        account_type: AccountType.USER,
        disabled: false,
        profile: {},
        flags: [AccountFlags.CREATE_ORGANIZATIONS],
      },
    };
    (getSession as jest.Mock).mockResolvedValue(mockSession);
    (isAuthorized as jest.Mock).mockReturnValue(true);

    const newAccount: Account = {
      account_id: "new-org-account",
      account_type: AccountType.ORGANIZATION,
      disabled: false,
      profile: {
        name: "New Org",
      },
      flags: [],
    };

    (putAccount as jest.Mock).mockResolvedValue([newAccount, true]);

    req.body = {
      account_id: "new-org-account",
      account_type: AccountType.ORGANIZATION,
      profile: {
        name: "New Org",
      },
    };

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(jsonBody(res)).toEqual(newAccount);
  });

  it("should create a service account successfully when user is an admin", async () => {
    const mockSession: UserSession = {
      identity_id: "admin-user",
      account: {
        account_id: "admin-account",
        account_type: AccountType.USER,
        disabled: false,
        profile: {},
        flags: [AccountFlags.ADMIN],
      },
    };
    (getSession as jest.Mock).mockResolvedValue(mockSession);
    (isAuthorized as jest.Mock).mockReturnValue(true);

    const newAccount: Account = {
      account_id: "new-service-account",
      account_type: AccountType.SERVICE,
      disabled: false,
      profile: {
        name: "New Service",
      },
      flags: [],
    };

    (putAccount as jest.Mock).mockResolvedValue([newAccount, true]);

    req.body = {
      account_id: "new-service-account",
      account_type: AccountType.SERVICE,
      profile: {
        name: "New Service",
      },
    };

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(jsonBody(res)).toEqual(newAccount);
  });

  it("should throw BadRequestError when account with same ID already exists", async () => {
    const mockSession: UserSession = {
      identity_id: "authorized-user",
      account: {
        account_id: "user-account",
        account_type: AccountType.USER,
        disabled: false,
        profile: {},
        flags: [],
      },
    };
    (getSession as jest.Mock).mockResolvedValue(mockSession);
    (isAuthorized as jest.Mock).mockReturnValue(true);
    (putAccount as jest.Mock).mockResolvedValue([
      { account_id: "existing-account" },
      false,
    ]);

    req.body = {
      account_id: "existing-account",
      account_type: AccountType.USER,
      profile: {
        name: "Existing User",
      },
    };

    await expect(handler(req, res)).rejects.toThrow(BadRequestError);
  });

  it("should throw ZodError when provided with invalid data", async () => {
    const mockSession: UserSession = {
      identity_id: "authorized-user",
      account: {
        account_id: "user-account",
        account_type: AccountType.USER,
        disabled: false,
        profile: {},
        flags: [],
      },
    };
    (getSession as jest.Mock).mockResolvedValue(mockSession);
    (isAuthorized as jest.Mock).mockReturnValue(true);

    req.body = {
      account_id: "invalid!account@id",
      account_type: "invalid_type",
      profile: {
        name: "Invalid Account",
      },
    };

    await expect(handler(req, res)).rejects.toThrow(ZodError);
  });
});
