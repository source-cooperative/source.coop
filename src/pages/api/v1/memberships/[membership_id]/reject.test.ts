import { NextApiRequest } from "next";
import httpMocks from "node-mocks-http";
import { handler } from "@/pages/api/v1/memberships/[membership_id]/reject";
import { getSession } from "@/api/utils";
import { isAuthorized } from "@/api/authz";
import { getMembership, putMembership } from "@/api/db";
import {
  UnauthorizedError,
  NotFoundError,
  MethodNotImplementedError,
  BadRequestError,
} from "@/api/errors";
import { MockNextApiResponse, jsonBody } from "@/api/utils/mock";
import {
  Membership,
  MembershipRole,
  MembershipState,
  Actions,
} from "@/api/types";

jest.mock("@/api/utils", () => ({
  getSession: jest.fn(),
}));

jest.mock("@/api/authz", () => ({
  isAuthorized: jest.fn(),
}));

jest.mock("@/api/db", () => ({
  getMembership: jest.fn(),
  putMembership: jest.fn(),
}));

describe("/api/v1/memberships/[membership_id]/reject", () => {
  let req: NextApiRequest;
  let res: MockNextApiResponse;

  beforeEach(() => {
    req = httpMocks.createRequest();
    res = httpMocks.createResponse() as MockNextApiResponse;
    req.query = { membership_id: "test-membership-id" };
    req.method = "POST";
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should throw NotFoundError when membership doesn't exist", async () => {
    (getSession as jest.Mock).mockResolvedValue({ identity_id: "user-1" });
    (getMembership as jest.Mock).mockResolvedValue(null);

    await expect(handler(req, res)).rejects.toThrow(NotFoundError);
  });

  it("should throw UnauthorizedError when user is not authorized", async () => {
    const mockMembership: Membership = {
      membership_id: "test-membership-id",
      account_id: "test-account",
      membership_account_id: "test-org",
      role: MembershipRole.Maintainers,
      state: MembershipState.Invited,
      state_changed: new Date().toISOString(),
    };
    (getSession as jest.Mock).mockResolvedValue({
      identity_id: "unauthorized-user",
    });
    (getMembership as jest.Mock).mockResolvedValue(mockMembership);
    (isAuthorized as jest.Mock).mockReturnValue(false);

    await expect(handler(req, res)).rejects.toThrow(UnauthorizedError);
  });

  it("should throw BadRequestError when membership is already accepted", async () => {
    const mockMembership: Membership = {
      membership_id: "test-membership-id",
      account_id: "test-account",
      membership_account_id: "test-org",
      role: MembershipRole.Maintainers,
      state: MembershipState.Member,
      state_changed: new Date().toISOString(),
    };
    (getSession as jest.Mock).mockResolvedValue({
      identity_id: "authorized-user",
    });
    (getMembership as jest.Mock).mockResolvedValue(mockMembership);
    (isAuthorized as jest.Mock).mockReturnValue(true);

    await expect(handler(req, res)).rejects.toThrow(BadRequestError);
  });

  it("should throw BadRequestError when membership is already revoked", async () => {
    const mockMembership: Membership = {
      membership_id: "test-membership-id",
      account_id: "test-account",
      membership_account_id: "test-org",
      role: MembershipRole.Maintainers,
      state: MembershipState.Revoked,
      state_changed: new Date().toISOString(),
    };
    (getSession as jest.Mock).mockResolvedValue({
      identity_id: "authorized-user",
    });
    (getMembership as jest.Mock).mockResolvedValue(mockMembership);
    (isAuthorized as jest.Mock).mockReturnValue(true);

    await expect(handler(req, res)).rejects.toThrow(BadRequestError);
  });

  it("should reject membership when user is authorized and membership is pending", async () => {
    const mockMembership: Membership = {
      membership_id: "test-membership-id",
      account_id: "test-account",
      membership_account_id: "test-org",
      role: MembershipRole.Maintainers,
      state: MembershipState.Invited,
      state_changed: "2023-01-01T00:00:00Z", // Use a fixed date for testing
    };
    (getSession as jest.Mock).mockResolvedValue({
      identity_id: "authorized-user",
    });
    (getMembership as jest.Mock).mockResolvedValue(mockMembership);
    (isAuthorized as jest.Mock).mockReturnValue(true);

    let updatedMembership: Membership | null = null;
    (putMembership as jest.Mock).mockImplementation((membership) => {
      updatedMembership = membership;
      return [membership, true];
    });

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    const responseBody = jsonBody(res);

    // Check all fields except state_changed
    expect(responseBody).toMatchObject({
      membership_id: mockMembership.membership_id,
      account_id: mockMembership.account_id,
      membership_account_id: mockMembership.membership_account_id,
      role: mockMembership.role,
      state: MembershipState.Revoked,
    });

    // Check that state_changed has been updated
    expect(responseBody.state_changed).not.toBe(mockMembership.state_changed);
    expect(new Date(responseBody.state_changed).getTime()).toBeGreaterThan(
      new Date(mockMembership.state_changed).getTime()
    );

    expect(isAuthorized).toHaveBeenCalledWith(
      expect.anything(),
      mockMembership,
      Actions.RejectMembership
    );

    expect(putMembership).toHaveBeenCalledWith(
      expect.objectContaining({
        ...mockMembership,
        state: MembershipState.Revoked,
        state_changed: expect.any(String),
      })
    );

    expect(updatedMembership).not.toBeNull();
    if (updatedMembership) {
      expect((updatedMembership as Membership).state_changed).not.toBe(
        mockMembership.state_changed
      );
      expect(
        new Date((updatedMembership as Membership).state_changed).getTime()
      ).toBeGreaterThan(new Date(mockMembership.state_changed).getTime());
    }
  });

  it("should throw MethodNotImplementedError for unsupported methods", async () => {
    req.method = "GET";
    await expect(handler(req, res)).rejects.toThrow(MethodNotImplementedError);

    req.method = "PUT";
    await expect(handler(req, res)).rejects.toThrow(MethodNotImplementedError);

    req.method = "DELETE";
    await expect(handler(req, res)).rejects.toThrow(MethodNotImplementedError);
  });
});
