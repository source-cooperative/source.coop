import {
  acceptInvitation,
  rejectInvitation,
  getPendingInvitation,
} from "./memberships";
import { membershipsTable } from "../clients";
import { getPageSession } from "../api/utils";
import { isAuthorized } from "../api/authz";
import { Membership, MembershipRole, MembershipState, Actions, AccountType, UserSession } from "@/types";
import { revalidatePath } from "next/cache";

// Mock dependencies
jest.mock("../clients", () => ({
  membershipsTable: {
    fetchById: jest.fn(),
    update: jest.fn(),
    listByUser: jest.fn(),
  },
}));

jest.mock("../api/utils", () => ({
  getPageSession: jest.fn(),
}));

jest.mock("../api/authz", () => ({
  isAuthorized: jest.fn(),
}));

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

const mockMembershipsTable = membershipsTable as jest.Mocked<
  typeof membershipsTable
>;
const mockGetPageSession = getPageSession as jest.MockedFunction<
  typeof getPageSession
>;
const mockIsAuthorized = isAuthorized as jest.MockedFunction<
  typeof isAuthorized
>;
const mockRevalidatePath = revalidatePath as jest.MockedFunction<
  typeof revalidatePath
>;

describe("Membership Invitation Actions", () => {
  const mockSession: UserSession = {
    identity_id: "test-identity-id",
    account: {
      account_id: "user-account-id",
      name: "Test User",
      type: AccountType.INDIVIDUAL,
      disabled: false,
      created_at: "2024-01-01T00:00:00.000Z",
      updated_at: "2024-01-01T00:00:00.000Z",
      flags: [],
      identity_id: "test-identity-id",
      metadata_public: {},
    },
  };

  const mockInvitation: Membership = {
    membership_id: "test-membership-id",
    account_id: "user-account-id",
    membership_account_id: "org-account-id",
    role: MembershipRole.ReadData,
    state: MembershipState.Invited,
    state_changed: "2024-01-01T00:00:00.000Z",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("acceptInvitation", () => {
    it("should accept invitation successfully", async () => {
      mockGetPageSession.mockResolvedValue(mockSession);
      mockMembershipsTable.fetchById.mockResolvedValue(mockInvitation);
      mockIsAuthorized.mockReturnValue(true);
      mockMembershipsTable.update.mockResolvedValue({
        ...mockInvitation,
        state: MembershipState.Member,
      });

      const result = await acceptInvitation("test-membership-id");

      expect(result.success).toBe(true);
      expect(mockMembershipsTable.fetchById).toHaveBeenCalledWith(
        "test-membership-id"
      );
      expect(mockIsAuthorized).toHaveBeenCalledWith(
        mockSession,
        mockInvitation,
        Actions.AcceptMembership
      );
      expect(mockMembershipsTable.update).toHaveBeenCalledWith(
        expect.objectContaining({
          ...mockInvitation,
          state: MembershipState.Member,
          state_changed: expect.any(String),
        })
      );
      expect(mockRevalidatePath).toHaveBeenCalled();
    });

    it("should return error if not authenticated", async () => {
      mockGetPageSession.mockResolvedValue(null);

      const result = await acceptInvitation("test-membership-id");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthenticated");
      expect(mockMembershipsTable.fetchById).not.toHaveBeenCalled();
    });

    it("should return error if membership not found", async () => {
      mockGetPageSession.mockResolvedValue(mockSession);
      mockMembershipsTable.fetchById.mockResolvedValue(null);

      const result = await acceptInvitation("test-membership-id");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Membership not found");
    });

    it("should return error if not authorized", async () => {
      mockGetPageSession.mockResolvedValue(mockSession);
      mockMembershipsTable.fetchById.mockResolvedValue(mockInvitation);
      mockIsAuthorized.mockReturnValue(false);

      const result = await acceptInvitation("test-membership-id");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized to accept this invitation");
    });

    it("should return error if membership already accepted", async () => {
      mockGetPageSession.mockResolvedValue(mockSession);
      mockMembershipsTable.fetchById.mockResolvedValue({
        ...mockInvitation,
        state: MembershipState.Member,
      });
      mockIsAuthorized.mockReturnValue(true);

      const result = await acceptInvitation("test-membership-id");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Membership is not in a pending state");
    });

    it("should return error if membership is revoked", async () => {
      mockGetPageSession.mockResolvedValue(mockSession);
      mockMembershipsTable.fetchById.mockResolvedValue({
        ...mockInvitation,
        state: MembershipState.Revoked,
      });
      mockIsAuthorized.mockReturnValue(true);

      const result = await acceptInvitation("test-membership-id");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Membership is not in a pending state");
    });

    it("should handle database errors gracefully", async () => {
      mockGetPageSession.mockResolvedValue(mockSession);
      mockMembershipsTable.fetchById.mockRejectedValue(
        new Error("Database error")
      );

      const result = await acceptInvitation("test-membership-id");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to accept invitation");
    });
  });

  describe("rejectInvitation", () => {
    it("should reject invitation successfully", async () => {
      mockGetPageSession.mockResolvedValue(mockSession);
      mockMembershipsTable.fetchById.mockResolvedValue(mockInvitation);
      mockIsAuthorized.mockReturnValue(true);
      mockMembershipsTable.update.mockResolvedValue({
        ...mockInvitation,
        state: MembershipState.Revoked,
      });

      const result = await rejectInvitation("test-membership-id");

      expect(result.success).toBe(true);
      expect(mockMembershipsTable.fetchById).toHaveBeenCalledWith(
        "test-membership-id"
      );
      expect(mockIsAuthorized).toHaveBeenCalledWith(
        mockSession,
        mockInvitation,
        Actions.RejectMembership
      );
      expect(mockMembershipsTable.update).toHaveBeenCalledWith(
        expect.objectContaining({
          ...mockInvitation,
          state: MembershipState.Revoked,
          state_changed: expect.any(String),
        })
      );
      expect(mockRevalidatePath).toHaveBeenCalled();
    });

    it("should return error if not authenticated", async () => {
      mockGetPageSession.mockResolvedValue(null);

      const result = await rejectInvitation("test-membership-id");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthenticated");
    });

    it("should return error if membership not found", async () => {
      mockGetPageSession.mockResolvedValue(mockSession);
      mockMembershipsTable.fetchById.mockResolvedValue(null);

      const result = await rejectInvitation("test-membership-id");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Membership not found");
    });

    it("should return error if not authorized", async () => {
      mockGetPageSession.mockResolvedValue(mockSession);
      mockMembershipsTable.fetchById.mockResolvedValue(mockInvitation);
      mockIsAuthorized.mockReturnValue(false);

      const result = await rejectInvitation("test-membership-id");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized to reject this invitation");
    });

    it("should handle database errors gracefully", async () => {
      mockGetPageSession.mockResolvedValue(mockSession);
      mockMembershipsTable.fetchById.mockRejectedValue(
        new Error("Database error")
      );

      const result = await rejectInvitation("test-membership-id");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to reject invitation");
    });
  });

  describe("getPendingInvitation", () => {
    it("should return pending organization invitation", async () => {
      mockGetPageSession.mockResolvedValue(mockSession);
      mockMembershipsTable.listByUser.mockResolvedValue([mockInvitation]);

      const result = await getPendingInvitation("org-account-id");

      expect(result).toEqual(mockInvitation);
      expect(mockMembershipsTable.listByUser).toHaveBeenCalledWith(
        "user-account-id"
      );
    });

    it("should return pending product invitation", async () => {
      const productInvitation: Membership = {
        ...mockInvitation,
        repository_id: "product-id",
      };
      mockGetPageSession.mockResolvedValue(mockSession);
      mockMembershipsTable.listByUser.mockResolvedValue([productInvitation]);

      const result = await getPendingInvitation("org-account-id", "product-id");

      expect(result).toEqual(productInvitation);
    });

    it("should return null if no pending invitation exists", async () => {
      mockGetPageSession.mockResolvedValue(mockSession);
      mockMembershipsTable.listByUser.mockResolvedValue([]);

      const result = await getPendingInvitation("org-account-id");

      expect(result).toBeNull();
    });

    it("should return null if user not authenticated", async () => {
      mockGetPageSession.mockResolvedValue(null);

      const result = await getPendingInvitation("org-account-id");

      expect(result).toBeNull();
      expect(mockMembershipsTable.listByUser).not.toHaveBeenCalled();
    });

    it("should return null if session has no account", async () => {
      mockGetPageSession.mockResolvedValue({
        ...mockSession,
        account: undefined,
      });

      const result = await getPendingInvitation("org-account-id");

      expect(result).toBeNull();
    });

    it("should filter by organization only (no product)", async () => {
      const orgInvitation: Membership = {
        ...mockInvitation,
        repository_id: undefined,
      };
      const productInvitation: Membership = {
        ...mockInvitation,
        membership_id: "product-membership-id",
        repository_id: "product-id",
      };

      mockGetPageSession.mockResolvedValue(mockSession);
      mockMembershipsTable.listByUser.mockResolvedValue([
        orgInvitation,
        productInvitation,
      ]);

      const result = await getPendingInvitation("org-account-id");

      // Should return org invitation, not product invitation
      expect(result).toEqual(orgInvitation);
      expect(result?.repository_id).toBeUndefined();
    });

    it("should only return invited memberships", async () => {
      const memberMembership: Membership = {
        ...mockInvitation,
        membership_id: "member-membership-id",
        state: MembershipState.Member,
      };

      mockGetPageSession.mockResolvedValue(mockSession);
      mockMembershipsTable.listByUser.mockResolvedValue([
        mockInvitation,
        memberMembership,
      ]);

      const result = await getPendingInvitation("org-account-id");

      // Should return invited membership, not active member
      expect(result).toEqual(mockInvitation);
      expect(result?.state).toBe(MembershipState.Invited);
    });

    it("should return null for wrong organization", async () => {
      mockGetPageSession.mockResolvedValue(mockSession);
      mockMembershipsTable.listByUser.mockResolvedValue([mockInvitation]);

      const result = await getPendingInvitation("different-org-id");

      expect(result).toBeNull();
    });

    it("should handle database errors gracefully", async () => {
      mockGetPageSession.mockResolvedValue(mockSession);
      mockMembershipsTable.listByUser.mockRejectedValue(
        new Error("Database error")
      );

      const result = await getPendingInvitation("org-account-id");

      expect(result).toBeNull();
    });
  });
});
