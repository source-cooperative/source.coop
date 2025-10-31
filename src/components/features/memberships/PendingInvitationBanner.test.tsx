import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PendingInvitationBanner } from "./PendingInvitationBanner";
import { Membership, MembershipRole, MembershipState } from "@/types";
import { acceptInvitation, rejectInvitation } from "@/lib/actions/memberships";
import { Theme } from "@radix-ui/themes";

// Mock the actions
jest.mock("@/lib/actions/memberships", () => ({
  acceptInvitation: jest.fn(),
  rejectInvitation: jest.fn(),
}));

const mockAcceptInvitation = acceptInvitation as jest.MockedFunction<
  typeof acceptInvitation
>;
const mockRejectInvitation = rejectInvitation as jest.MockedFunction<
  typeof rejectInvitation
>;

// Mock window.location.reload
const mockReload = jest.fn();
Object.defineProperty(window, "location", {
  value: { reload: mockReload },
  writable: true,
});

// Mock window.alert
global.alert = jest.fn();

const renderWithTheme = (component: React.ReactElement) => {
  return render(<Theme>{component}</Theme>);
};

describe("PendingInvitationBanner", () => {
  const mockInvitation: Membership = {
    membership_id: "test-membership-id",
    account_id: "user-account-id",
    membership_account_id: "org-account-id",
    role: MembershipRole.ReadData,
    state: MembershipState.Invited,
    state_changed: new Date().toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Display", () => {
    it("should render organization invitation with correct role name", () => {
      renderWithTheme(
        <PendingInvitationBanner
          invitation={mockInvitation}
          organizationName="Test Organization"
        />
      );

      expect(
        screen.getByText(/You have been invited to join this organization/i)
      ).toBeInTheDocument();
      expect(screen.getByText("Data Reader")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /accept/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /decline/i })).toBeInTheDocument();
    });

    it("should render product invitation with correct names", () => {
      renderWithTheme(
        <PendingInvitationBanner
          invitation={mockInvitation}
          organizationName="Test Organization"
          productName="Test Product"
        />
      );

      expect(
        screen.getByText(/You have been invited to join this product/i)
      ).toBeInTheDocument();
    });

    it("should format different role names correctly", () => {
      const roles = [
        { role: MembershipRole.Owners, name: "Owner" },
        { role: MembershipRole.Maintainers, name: "Maintainer" },
        { role: MembershipRole.ReadData, name: "Data Reader" },
        { role: MembershipRole.WriteData, name: "Data Writer" },
      ];

      roles.forEach(({ role, name }) => {
        const { unmount } = renderWithTheme(
          <PendingInvitationBanner
            invitation={{ ...mockInvitation, role }}
            organizationName="Test Org"
          />
        );

        expect(screen.getByText(name)).toBeInTheDocument();
        unmount();
      });
    });

    it('should use "an" for roles starting with vowels', () => {
      const invitationWithOwner: Membership = {
        ...mockInvitation,
        role: MembershipRole.Owners,
      };

      renderWithTheme(
        <PendingInvitationBanner
          invitation={invitationWithOwner}
          organizationName="Test Org"
        />
      );

      expect(screen.getByText(/as an/i)).toBeInTheDocument();
    });

    it('should use "a" for roles starting with consonants', () => {
      renderWithTheme(
        <PendingInvitationBanner
          invitation={mockInvitation}
          organizationName="Test Org"
        />
      );

      expect(screen.getByText(/as a/i)).toBeInTheDocument();
    });
  });

  describe("Accept Invitation", () => {
    it("should call acceptInvitation and reload on success", async () => {
      mockAcceptInvitation.mockResolvedValue({ success: true });
      const user = userEvent.setup();

      renderWithTheme(
        <PendingInvitationBanner
          invitation={mockInvitation}
          organizationName="Test Org"
        />
      );

      const acceptButton = screen.getByRole("button", { name: /accept/i });
      await user.click(acceptButton);

      await waitFor(() => {
        expect(mockAcceptInvitation).toHaveBeenCalledWith("test-membership-id");
        expect(mockReload).toHaveBeenCalled();
      });
    });

    it("should show error alert on accept failure", async () => {
      mockAcceptInvitation.mockResolvedValue({
        success: false,
        error: "Failed to accept",
      });
      const user = userEvent.setup();

      renderWithTheme(
        <PendingInvitationBanner
          invitation={mockInvitation}
          organizationName="Test Org"
        />
      );

      const acceptButton = screen.getByRole("button", { name: /accept/i });
      await user.click(acceptButton);

      await waitFor(() => {
        expect(mockAcceptInvitation).toHaveBeenCalledWith("test-membership-id");
        expect(global.alert).toHaveBeenCalledWith("Failed to accept");
        expect(mockReload).not.toHaveBeenCalled();
      });
    });

    it("should disable buttons while processing", async () => {
      mockAcceptInvitation.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );
      const user = userEvent.setup();

      renderWithTheme(
        <PendingInvitationBanner
          invitation={mockInvitation}
          organizationName="Test Org"
        />
      );

      const acceptButton = screen.getByRole("button", { name: /accept/i });
      const declineButton = screen.getByRole("button", { name: /decline/i });

      await user.click(acceptButton);

      expect(acceptButton).toBeDisabled();
      expect(declineButton).toBeDisabled();
    });

    it("should show processing text on accept button", async () => {
      mockAcceptInvitation.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );
      const user = userEvent.setup();

      renderWithTheme(
        <PendingInvitationBanner
          invitation={mockInvitation}
          organizationName="Test Org"
        />
      );

      const acceptButton = screen.getByRole("button", { name: /accept/i });
      await user.click(acceptButton);

      expect(screen.getByText("Processing...")).toBeInTheDocument();
    });
  });

  describe("Reject Invitation", () => {
    it("should call rejectInvitation and hide banner on success", async () => {
      mockRejectInvitation.mockResolvedValue({ success: true });
      const user = userEvent.setup();

      renderWithTheme(
        <PendingInvitationBanner
          invitation={mockInvitation}
          organizationName="Test Org"
        />
      );

      const declineButton = screen.getByRole("button", { name: /decline/i });
      await user.click(declineButton);

      await waitFor(() => {
        expect(mockRejectInvitation).toHaveBeenCalledWith("test-membership-id");
      });

      // Banner should be hidden
      expect(
        screen.queryByText(/You have been invited/i)
      ).not.toBeInTheDocument();
    });

    it("should show error alert on reject failure", async () => {
      mockRejectInvitation.mockResolvedValue({
        success: false,
        error: "Failed to reject",
      });
      const user = userEvent.setup();

      renderWithTheme(
        <PendingInvitationBanner
          invitation={mockInvitation}
          organizationName="Test Org"
        />
      );

      const declineButton = screen.getByRole("button", { name: /decline/i });
      await user.click(declineButton);

      await waitFor(() => {
        expect(mockRejectInvitation).toHaveBeenCalledWith("test-membership-id");
        expect(global.alert).toHaveBeenCalledWith("Failed to reject");
      });

      // Banner should still be visible
      expect(
        screen.getByText(/You have been invited/i)
      ).toBeInTheDocument();
    });
  });

  describe("Error Handling", () => {
    it("should handle accept invitation error", async () => {
      mockAcceptInvitation.mockRejectedValue(new Error("Network error"));
      const user = userEvent.setup();

      renderWithTheme(
        <PendingInvitationBanner
          invitation={mockInvitation}
          organizationName="Test Org"
        />
      );

      const acceptButton = screen.getByRole("button", { name: /accept/i });
      await user.click(acceptButton);

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith(
          "An error occurred while accepting the invitation"
        );
        expect(mockReload).not.toHaveBeenCalled();
      });
    });

    it("should handle reject invitation error", async () => {
      mockRejectInvitation.mockRejectedValue(new Error("Network error"));
      const user = userEvent.setup();

      renderWithTheme(
        <PendingInvitationBanner
          invitation={mockInvitation}
          organizationName="Test Org"
        />
      );

      const declineButton = screen.getByRole("button", { name: /decline/i });
      await user.click(declineButton);

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith(
          "An error occurred while rejecting the invitation"
        );
      });

      // Banner should still be visible
      expect(
        screen.getByText(/You have been invited/i)
      ).toBeInTheDocument();
    });
  });
});
