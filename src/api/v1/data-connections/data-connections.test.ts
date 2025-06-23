import { NextApiRequest } from "next";
import httpMocks from "node-mocks-http";
import { handler } from "@/pages/api/v1/data-connections";
import { getSession } from "@/api/utils";
import { isAuthorized } from "@/api/authz";
import { getDataConnections, putDataConnection } from "@/api/db";
import { UnauthorizedError, BadRequestError } from "@/api/errors";
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
  getDataConnections: jest.fn(),
  putDataConnection: jest.fn(),
}));

describe("/api/v1/data-connections", () => {
  let req: NextApiRequest;
  let res: MockNextApiResponse;

  beforeEach(() => {
    req = httpMocks.createRequest();
    res = httpMocks.createResponse() as MockNextApiResponse;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("GET - listDataConnectionsHandler", () => {
    beforeEach(() => {
      req.method = "GET";
    });

    it("should return data connections when user is authorized", async () => {
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
      const mockDataConnections: DataConnection[] = [
        {
          data_connection_id: "connection-1",
          name: "Test Connection 1",
          read_only: false,
          allowed_data_modes: [RepositoryDataMode.Open],
          details: {
            provider: DataProvider.S3,
            bucket: "test-bucket",
            base_prefix: "test-prefix",
            region: S3Regions.US_EAST_1,
          },
        },
        {
          data_connection_id: "connection-2",
          name: "Test Connection 2",
          read_only: true,
          allowed_data_modes: [RepositoryDataMode.Open],
          details: {
            provider: DataProvider.S3,
            bucket: "another-bucket",
            base_prefix: "another-prefix",
            region: S3Regions.US_WEST_2,
          },
        },
      ];

      (getSession as jest.Mock).mockResolvedValue(mockSession);
      (isAuthorized as jest.Mock).mockReturnValue(true);
      (getDataConnections as jest.Mock).mockResolvedValue(mockDataConnections);

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(jsonBody(res)).toEqual(mockDataConnections);
    });
  });

  describe("POST - createDataConnectionHandler", () => {
    beforeEach(() => {
      req.method = "POST";
      req.body = {
        data_connection_id: "new-connection",
        name: "New Test Connection",
        read_only: false,
        allowed_data_modes: [RepositoryDataMode.Open],
        details: {
          provider: DataProvider.S3,
          bucket: "new-bucket",
          base_prefix: "new-prefix",
          region: S3Regions.EU_WEST_1,
        },
        authentication: {
          type: DataConnectionAuthenticationType.S3AccessKey,
          access_key_id: "AKIAIOSFODNN7EXAMPLE",
          secret_access_key: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
        },
      };
    });

    it("should create a data connection when user is authorized", async () => {
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
      (isAuthorized as jest.Mock).mockReturnValue(false);

      await expect(handler(req, res)).rejects.toThrow(UnauthorizedError);
    });

    it("should throw BadRequestError when data connection already exists", async () => {
      (getSession as jest.Mock).mockResolvedValue({
        identity_id: "authorized-user",
        account: {
          account_id: "admin-account",
          account_type: "user",
          disabled: false,
          profile: {},
          flags: [AccountFlags.ADMIN],
        },
      });
      (isAuthorized as jest.Mock).mockReturnValue(true);
      (putDataConnection as jest.Mock).mockResolvedValue([req.body, false]);

      await expect(handler(req, res)).rejects.toThrow(BadRequestError);
    });
  });
});
