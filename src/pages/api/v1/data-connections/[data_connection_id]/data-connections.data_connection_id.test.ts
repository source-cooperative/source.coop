import { NextApiRequest } from "next";
import httpMocks from "node-mocks-http";
import { handler } from "@/pages/api/v1/data-connections/[data_connection_id]";
import { getSession } from "@/api/utils";
import { isAuthorized } from "@/api/authz";
import { getDataConnection, putDataConnection } from "@/api/db";
import {
  UnauthorizedError,
  NotFoundError,
  MethodNotImplementedError,
} from "@/api/errors";
import { MockNextApiResponse, jsonBody } from "@/api/utils/mock";
import {
  DataProvider,
  S3Regions,
  DataConnectionAuthenticationType,
  AccountFlags,
  UserSession,
  DataConnection,
  AccountType,
  RepositoryDataMode,
} from "@/api/types";

jest.mock("@/api/utils", () => ({
  getSession: jest.fn(),
}));

jest.mock("@/api/authz", () => ({
  isAuthorized: jest.fn(),
}));

jest.mock("@/api/db", () => ({
  getDataConnection: jest.fn(),
  putDataConnection: jest.fn(),
}));

describe("/api/v1/data-connections/[data_connection_id]", () => {
  let req: NextApiRequest;
  let res: MockNextApiResponse;

  beforeEach(() => {
    req = httpMocks.createRequest();
    res = httpMocks.createResponse() as MockNextApiResponse;
    req.query = { data_connection_id: "test-connection" };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("GET - getDataConnectionHandler", () => {
    beforeEach(() => {
      req.method = "GET";
    });

    it("should return data connection when user is authorized", async () => {
      const mockSession: UserSession = {
        identity_id: "authorized-user",
        account: {
          account_id: "user-account",
          account_type: AccountType.USER,
          disabled: false,
          profile: {},
          flags: [AccountFlags.ADMIN],
        },
      };
      const mockDataConnection: DataConnection = {
        data_connection_id: "test-connection",
        name: "Test Connection",
        read_only: false,
        allowed_data_modes: [RepositoryDataMode.Open],
        details: {
          provider: DataProvider.S3,
          bucket: "test-bucket",
          base_prefix: "test-prefix",
          region: S3Regions.US_EAST_1,
        },
        authentication: {
          type: DataConnectionAuthenticationType.S3AccessKey,
          access_key_id: "AKIAIOSFODNN7EXAMPLE",
          secret_access_key: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
        },
      };

      (getSession as jest.Mock).mockResolvedValue(mockSession);
      (getDataConnection as jest.Mock).mockResolvedValue(mockDataConnection);
      (isAuthorized as jest.Mock).mockReturnValue(true);

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(jsonBody(res)).toEqual(mockDataConnection);
    });

    it("should throw UnauthorizedError when user is not authorized", async () => {
      (getSession as jest.Mock).mockResolvedValue({
        identity_id: "unauthorized-user",
      });
      (getDataConnection as jest.Mock).mockResolvedValue({
        data_connection_id: "test-connection",
      });
      (isAuthorized as jest.Mock).mockReturnValue(false);

      await expect(handler(req, res)).rejects.toThrow(UnauthorizedError);
    });

    it("should throw NotFoundError when data connection doesn't exist", async () => {
      (getSession as jest.Mock).mockResolvedValue({
        identity_id: "authorized-user",
      });
      (getDataConnection as jest.Mock).mockResolvedValue(null);

      await expect(handler(req, res)).rejects.toThrow(NotFoundError);
    });
  });

  describe("PUT - putDataConnectionHandler", () => {
    beforeEach(() => {
      req.method = "PUT";
      req.body = {
        data_connection_id: "test-connection",
        name: "Updated Test Connection",
        read_only: true,
        allowed_data_modes: [RepositoryDataMode.Open],
        details: {
          provider: DataProvider.S3,
          bucket: "updated-bucket",
          base_prefix: "updated-prefix",
          region: S3Regions.EU_WEST_1,
        },
      };
    });

    it("should update data connection when user is authorized", async () => {
      const mockSession: UserSession = {
        identity_id: "authorized-user",
        account: {
          account_id: "admin-account",
          account_type: AccountType.USER,
          disabled: false,
          profile: {},
          flags: [AccountFlags.ADMIN],
        },
      };
      (getSession as jest.Mock).mockResolvedValue(mockSession);
      (getDataConnection as jest.Mock).mockResolvedValue({
        data_connection_id: "test-connection",
      });
      (isAuthorized as jest.Mock).mockReturnValue(true);
      (putDataConnection as jest.Mock).mockResolvedValue([req.body, true]);

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(jsonBody(res)).toEqual(req.body);
    });

    it("should throw UnauthorizedError when user is not authorized", async () => {
      (getSession as jest.Mock).mockResolvedValue({
        identity_id: "unauthorized-user",
      });
      (getDataConnection as jest.Mock).mockResolvedValue({
        data_connection_id: "test-connection",
      });
      (isAuthorized as jest.Mock).mockReturnValue(false);

      await expect(handler(req, res)).rejects.toThrow(UnauthorizedError);
    });

    it("should throw NotFoundError when data connection doesn't exist", async () => {
      (getSession as jest.Mock).mockResolvedValue({
        identity_id: "authorized-user",
      });
      (getDataConnection as jest.Mock).mockResolvedValue(null);

      await expect(handler(req, res)).rejects.toThrow(NotFoundError);
    });
  });

  describe("DELETE - disableDataConnectionHandler", () => {
    beforeEach(() => {
      req.method = "DELETE";
    });

    it("should disable data connection when user is authorized", async () => {
      const mockSession: UserSession = {
        identity_id: "authorized-user",
        account: {
          account_id: "admin-account",
          account_type: AccountType.USER,
          disabled: false,
          profile: {},
          flags: [AccountFlags.ADMIN],
        },
      };
      const mockDataConnection: DataConnection = {
        data_connection_id: "test-connection",
        name: "Test Connection",
        read_only: false,
        allowed_data_modes: [RepositoryDataMode.Open],
        details: {
          provider: DataProvider.S3,
          bucket: "test-bucket",
          base_prefix: "test-prefix",
          region: S3Regions.US_EAST_1,
        },
      };
      const disabledDataConnection = { ...mockDataConnection, read_only: true };

      (getSession as jest.Mock).mockResolvedValue(mockSession);
      (getDataConnection as jest.Mock).mockResolvedValue(mockDataConnection);
      (isAuthorized as jest.Mock).mockReturnValue(true);
      (putDataConnection as jest.Mock).mockResolvedValue([
        disabledDataConnection,
        true,
      ]);

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(jsonBody(res)).toEqual(disabledDataConnection);
    });

    it("should throw UnauthorizedError when user is not authorized", async () => {
      (getSession as jest.Mock).mockResolvedValue({
        identity_id: "unauthorized-user",
      });
      (getDataConnection as jest.Mock).mockResolvedValue({
        data_connection_id: "test-connection",
      });
      (isAuthorized as jest.Mock).mockReturnValue(false);

      await expect(handler(req, res)).rejects.toThrow(UnauthorizedError);
    });

    it("should throw NotFoundError when data connection doesn't exist", async () => {
      (getSession as jest.Mock).mockResolvedValue({
        identity_id: "authorized-user",
      });
      (getDataConnection as jest.Mock).mockResolvedValue(null);

      await expect(handler(req, res)).rejects.toThrow(NotFoundError);
    });
  });

  it("should throw MethodNotImplementedError for unsupported HTTP methods", async () => {
    req.method = "PATCH";

    await expect(handler(req, res)).rejects.toThrow(MethodNotImplementedError);
  });
});
