import { NextApiRequest } from "next";
import httpMocks from "node-mocks-http";
import { handler } from "@/pages/api/v1/repositories/[account_id]/[repository_id]/members";
import { getSession } from "@/api/utils";
import { isAuthorized } from "@/api/authz";
import {
  getRepository,
  getAccount,
  getMemberships,
  putMembership,
} from "@/api/db";
import {
  UnauthorizedError,
  NotFoundError,
  MethodNotImplementedError,
  BadRequestError,
} from "@/api/errors";
import { MockNextApiResponse, jsonBody } from "@/api/utils/mock";
import {
  Repository,
  Account,
  AccountType,
  Membership,
  MembershipRole,
  MembershipState,
  RepositoryState,
  RepositoryDataMode,
  RepositoryFeatured,
  Actions,
} from "@/api/types";

jest.mock("@/api/utils", () => ({
  getSession: jest.fn(),
}));

jest.mock("@/api/authz", () => ({
  isAuthorized: jest.fn(),
}));

jest.mock("@/api/db", () => ({
  getRepository: jest.fn(),
  getAccount: jest.fn(),
  getMemberships: jest.fn(),
  putMembership: jest.fn(),
}));

describe("/api/v1/repositories/[account_id]/[repository_id]/members", () => {
  let req: NextApiRequest;
  let res: MockNextApiResponse;

  beforeEach(() => {
    req = httpMocks.createRequest();
    res = httpMocks.createResponse() as MockNextApiResponse;
    req.query = { account_id: "test-account", repository_id: "test-repo" };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("POST - inviteMemberHandler", () => {
    beforeEach(() => {
      req.method = "POST";
      req.body = {
        account_id: "invited-account",
        role: MembershipRole.Maintainers,
      };
    });

    it("should throw NotFoundError when repository doesn't exist", async () => {
      (getSession as jest.Mock).mockResolvedValue({ identity_id: "user-1" });
      (getRepository as jest.Mock).mockResolvedValue(null);

      await expect(handler(req, res)).rejects.toThrow(NotFoundError);
    });

    it("should throw NotFoundError when invited account doesn't exist", async () => {
      const mockRepository: Repository = {
        account_id: "test-account",
        repository_id: "test-repo",
        state: RepositoryState.Listed,
        data_mode: RepositoryDataMode.Open,
        featured: RepositoryFeatured.NotFeatured,
        meta: { title: "Test Repo", description: "Test description", tags: [] },
        data: { primary_mirror: "test-mirror", mirrors: {} },
        published: new Date().toISOString(),
        disabled: false,
      };
      (getSession as jest.Mock).mockResolvedValue({ identity_id: "user-1" });
      (getRepository as jest.Mock).mockResolvedValue(mockRepository);
      (getAccount as jest.Mock).mockResolvedValue(null);

      await expect(handler(req, res)).rejects.toThrow(NotFoundError);
    });

    it("should throw UnauthorizedError when user is not authorized", async () => {
      const mockRepository: Repository = {
        account_id: "test-account",
        repository_id: "test-repo",
        state: RepositoryState.Listed,
        data_mode: RepositoryDataMode.Open,
        featured: RepositoryFeatured.NotFeatured,
        meta: { title: "Test Repo", description: "Test description", tags: [] },
        data: { primary_mirror: "test-mirror", mirrors: {} },
        published: new Date().toISOString(),
        disabled: false,
      };
      const mockAccount: Account = {
        account_id: "invited-account",
        account_type: AccountType.USER,
        disabled: false,
        profile: {},
        flags: [],
      };
      (getSession as jest.Mock).mockResolvedValue({
        identity_id: "unauthorized-user",
      });
      (getRepository as jest.Mock).mockResolvedValue(mockRepository);
      (getAccount as jest.Mock).mockResolvedValue(mockAccount);
      (isAuthorized as jest.Mock).mockReturnValue(false);

      await expect(handler(req, res)).rejects.toThrow(UnauthorizedError);
    });

    it("should throw BadRequestError when member is already invited or exists", async () => {
      const mockRepository: Repository = {
        account_id: "test-account",
        repository_id: "test-repo",
        state: RepositoryState.Listed,
        data_mode: RepositoryDataMode.Open,
        featured: RepositoryFeatured.NotFeatured,
        meta: { title: "Test Repo", description: "Test description", tags: [] },
        data: { primary_mirror: "test-mirror", mirrors: {} },
        published: new Date().toISOString(),
        disabled: false,
      };
      const mockAccount: Account = {
        account_id: "invited-account",
        account_type: AccountType.USER,
        disabled: false,
        profile: {},
        flags: [],
      };
      const existingMembership: Membership = {
        membership_id: "existing-membership",
        account_id: "invited-account",
        membership_account_id: "test-account",
        repository_id: "test-repo",
        role: MembershipRole.Maintainers,
        state: MembershipState.Invited,
        state_changed: new Date().toISOString(),
      };
      (getSession as jest.Mock).mockResolvedValue({
        identity_id: "authorized-user",
      });
      (getRepository as jest.Mock).mockResolvedValue(mockRepository);
      (getAccount as jest.Mock).mockResolvedValue(mockAccount);
      (isAuthorized as jest.Mock).mockReturnValue(true);
      (getMemberships as jest.Mock).mockResolvedValue([existingMembership]);

      await expect(handler(req, res)).rejects.toThrow(BadRequestError);
    });

    it("should create membership when user is authorized", async () => {
      const mockRepository: Repository = {
        account_id: "test-account",
        repository_id: "test-repo",
        state: RepositoryState.Listed,
        data_mode: RepositoryDataMode.Open,
        featured: RepositoryFeatured.NotFeatured,
        meta: { title: "Test Repo", description: "Test description", tags: [] },
        data: { primary_mirror: "test-mirror", mirrors: {} },
        published: new Date().toISOString(),
        disabled: false,
      };
      const mockAccount: Account = {
        account_id: "invited-account",
        account_type: AccountType.USER,
        disabled: false,
        profile: {},
        flags: [],
      };
      const createdMembership: Membership = {
        membership_id: "mocked-uuid",
        account_id: "invited-account",
        membership_account_id: "test-account",
        repository_id: "test-repo",
        role: MembershipRole.Maintainers,
        state: MembershipState.Invited,
        state_changed: new Date().toISOString(),
      };
      (getSession as jest.Mock).mockResolvedValue({
        identity_id: "authorized-user",
      });
      (getRepository as jest.Mock).mockResolvedValue(mockRepository);
      (getAccount as jest.Mock).mockResolvedValue(mockAccount);
      (isAuthorized as jest.Mock).mockReturnValue(true);
      (getMemberships as jest.Mock).mockResolvedValue([]);
      (putMembership as jest.Mock).mockResolvedValue([createdMembership, true]);

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      const responseBody = jsonBody(res);
      expect(responseBody).toMatchObject({
        account_id: "invited-account",
        membership_account_id: "test-account",
        repository_id: "test-repo",
        role: MembershipRole.Maintainers,
        state: MembershipState.Invited,
      });
      expect(responseBody.membership_id).toBeTruthy();
      expect(responseBody.state_changed).toBeTruthy();
      expect(isAuthorized).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          account_id: "invited-account",
          membership_account_id: "test-account",
          repository_id: "test-repo",
          role: MembershipRole.Maintainers,
          state: MembershipState.Invited,
        }),
        Actions.InviteMembership
      );
      expect(putMembership).toHaveBeenCalledWith(
        expect.objectContaining({
          account_id: "invited-account",
          membership_account_id: "test-account",
          repository_id: "test-repo",
          role: MembershipRole.Maintainers,
          state: MembershipState.Invited,
        }),
        true
      );
    });
  });

  describe("GET - getMembersHandler", () => {
    beforeEach(() => {
      req.method = "GET";
    });

    it("should throw NotFoundError when repository doesn't exist", async () => {
      (getSession as jest.Mock).mockResolvedValue({ identity_id: "user-1" });
      (getRepository as jest.Mock).mockResolvedValue(null);

      await expect(handler(req, res)).rejects.toThrow(NotFoundError);
    });

    it("should throw UnauthorizedError when user is not authorized", async () => {
      const mockRepository: Repository = {
        account_id: "test-account",
        repository_id: "test-repo",
        state: RepositoryState.Listed,
        data_mode: RepositoryDataMode.Open,
        featured: RepositoryFeatured.NotFeatured,
        meta: { title: "Test Repo", description: "Test description", tags: [] },
        data: { primary_mirror: "test-mirror", mirrors: {} },
        published: new Date().toISOString(),
        disabled: false,
      };
      (getSession as jest.Mock).mockResolvedValue({
        identity_id: "unauthorized-user",
      });
      (getRepository as jest.Mock).mockResolvedValue(mockRepository);
      (isAuthorized as jest.Mock).mockReturnValue(false);

      await expect(handler(req, res)).rejects.toThrow(UnauthorizedError);
    });

    it("should return memberships when user is authorized", async () => {
      const mockRepository: Repository = {
        account_id: "test-account",
        repository_id: "test-repo",
        state: RepositoryState.Listed,
        data_mode: RepositoryDataMode.Open,
        featured: RepositoryFeatured.NotFeatured,
        meta: { title: "Test Repo", description: "Test description", tags: [] },
        data: { primary_mirror: "test-mirror", mirrors: {} },
        published: new Date().toISOString(),
        disabled: false,
      };
      const mockMemberships: Membership[] = [
        {
          membership_id: "membership-1",
          account_id: "member-1",
          membership_account_id: "test-account",
          repository_id: "test-repo",
          role: MembershipRole.Maintainers,
          state: MembershipState.Member,
          state_changed: new Date().toISOString(),
        },
        {
          membership_id: "membership-2",
          account_id: "member-2",
          membership_account_id: "test-account",
          repository_id: "test-repo",
          role: MembershipRole.ReadData,
          state: MembershipState.Invited,
          state_changed: new Date().toISOString(),
        },
      ];
      (getSession as jest.Mock).mockResolvedValue({
        identity_id: "authorized-user",
      });
      (getRepository as jest.Mock).mockResolvedValue(mockRepository);
      (isAuthorized as jest.Mock).mockReturnValue(true);
      (getMemberships as jest.Mock).mockResolvedValue(mockMemberships);

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(jsonBody(res)).toEqual(mockMemberships);
      expect(isAuthorized).toHaveBeenCalledWith(
        expect.anything(),
        mockRepository,
        Actions.ListRepositoryMemberships
      );
      expect(isAuthorized).toHaveBeenCalledTimes(3); // Once for ListRepositoryMemberships and twice for GetMembership
    });
  });

  describe("Unsupported methods", () => {
    it("should throw MethodNotImplementedError for unsupported methods", async () => {
      req.method = "PUT";
      await expect(handler(req, res)).rejects.toThrow(
        MethodNotImplementedError
      );

      req.method = "DELETE";
      await expect(handler(req, res)).rejects.toThrow(
        MethodNotImplementedError
      );
    });
  });
});
