import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EditProfileForm } from "./EditProfileForm";
import { AccountType, OrganizationalAccount, IndividualAccount } from "@/types";
import * as accountActions from "@/lib/actions/account";
import { Theme } from "@radix-ui/themes";

// Mock the account actions
jest.mock("@/lib/actions/account", () => ({
  updateAccountProfile: jest.fn(),
}));

// Mock DynamicForm to simplify testing
jest.mock("@/components/core", () => ({
  DynamicForm: ({
    fields,
    initialValues,
    submitButtonText,
    hiddenFields,
  }: any) => (
    <form data-testid="edit-profile-form">
      {fields.map((field: any) => (
        <div key={field.name} data-testid={`field-${field.name}`}>
          <label htmlFor={field.name}>{field.label}</label>
          {field.type === "custom" ? (
            <div data-testid={`custom-${field.name}`}>
              {field.customComponent}
            </div>
          ) : field.type === "textarea" ? (
            <textarea
              id={field.name}
              name={field.name}
              defaultValue={initialValues[field.name]}
              placeholder={field.placeholder}
              readOnly={field.readOnly}
              data-testid={`input-${field.name}`}
            />
          ) : (
            <input
              id={field.name}
              name={field.name}
              type={field.type}
              defaultValue={initialValues[field.name]}
              placeholder={field.placeholder}
              readOnly={field.readOnly}
              data-testid={`input-${field.name}`}
            />
          )}
          {field.description && (
            <span data-testid={`description-${field.name}`}>
              {field.description}
            </span>
          )}
        </div>
      ))}
      <button type="submit">{submitButtonText}</button>
      {Object.entries(hiddenFields).map(([key, value]) => (
        <input
          key={key}
          type="hidden"
          name={key}
          value={value as string}
          data-testid={`hidden-${key}`}
        />
      ))}
    </form>
  ),
}));

// Helper function to render components with required providers
function renderWithProviders(ui: React.ReactElement) {
  return render(<Theme>{ui}</Theme>);
}

describe("EditProfileForm - Organization Account", () => {
  const mockOrganizationAccount: OrganizationalAccount = {
    account_id: "test-org",
    type: AccountType.ORGANIZATION,
    identity_id: undefined,
    name: "Test Organization",
    emails: [
      {
        address: "contact@testorg.com",
        verified: true,
        is_primary: true,
        added_at: "2024-01-01T00:00:00Z",
      },
    ],
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    disabled: false,
    flags: [],
    metadata_public: {
      bio: "We are a test organization",
      location: "San Francisco, CA",
      domains: [
        {
          domain: "testorg.com",
          status: "verified",
          created_at: "2024-01-01T00:00:00Z",
        },
        {
          domain: "another-domain.org",
          status: "verified",
          created_at: "2024-01-01T00:00:00Z",
        },
      ],
      ror_id: "https://ror.org/0123456789",
    },
    metadata_private: {},
  };

  const mockIndividualAccount: IndividualAccount = {
    account_id: "test-individual",
    type: AccountType.INDIVIDUAL,
    identity_id: "test-identity-id",
    name: "Test User",
    emails: [
      {
        address: "test@example.com",
        verified: true,
        is_primary: true,
        added_at: "2024-01-01T00:00:00Z",
      },
    ],
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    disabled: false,
    flags: [],
    metadata_public: {
      bio: "Software developer",
      location: "New York, NY",
      orcid: "0000-0002-1825-0097",
    },
    metadata_private: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render the form for an organization account", () => {
      renderWithProviders(<EditProfileForm account={mockOrganizationAccount} />);

      expect(screen.getByTestId("edit-profile-form")).toBeInTheDocument();
      expect(screen.getByText("Save Changes")).toBeInTheDocument();
    });

    it("should display organization-specific field labels", () => {
      renderWithProviders(<EditProfileForm account={mockOrganizationAccount} />);

      expect(screen.getByText("Description")).toBeInTheDocument();
      expect(
        screen.getByText(
          "A brief description of your organization (220 characters maximum)"
        )
      ).toBeInTheDocument();
    });

    it("should NOT display ORCID field for organization accounts", () => {
      renderWithProviders(<EditProfileForm account={mockOrganizationAccount} />);

      expect(screen.queryByText("ORCID ID")).not.toBeInTheDocument();
      expect(screen.queryByTestId("field-orcid")).not.toBeInTheDocument();
    });

    it("should display ORCID field for individual accounts", () => {
      renderWithProviders(<EditProfileForm account={mockIndividualAccount} />);

      expect(screen.getByText("ORCID ID")).toBeInTheDocument();
      expect(screen.getByTestId("field-orcid")).toBeInTheDocument();
    });

    it("should display 'Bio' label for individual accounts", () => {
      renderWithProviders(<EditProfileForm account={mockIndividualAccount} />);

      expect(screen.getByText("Bio")).toBeInTheDocument();
      const descriptionInput = screen.getByTestId("input-description") as HTMLTextAreaElement;
      expect(descriptionInput.placeholder).toBe("Tell us about yourself");
    });
  });

  describe("Form Fields - Organization", () => {
    it("should populate name field with organization name", () => {
      renderWithProviders(<EditProfileForm account={mockOrganizationAccount} />);

      const nameInput = screen.getByTestId(
        "input-name"
      ) as HTMLInputElement;
      expect(nameInput.value).toBe("Test Organization");
    });

    it("should populate email field with primary email", () => {
      renderWithProviders(<EditProfileForm account={mockOrganizationAccount} />);

      const emailInput = screen.getByTestId(
        "input-email"
      ) as HTMLInputElement;
      expect(emailInput.value).toBe("contact@testorg.com");
    });

    it("should make email field read-only", () => {
      renderWithProviders(<EditProfileForm account={mockOrganizationAccount} />);

      const emailInput = screen.getByTestId(
        "input-email"
      ) as HTMLInputElement;
      expect(emailInput.readOnly).toBe(true);
    });

    it("should populate description field with bio", () => {
      renderWithProviders(<EditProfileForm account={mockOrganizationAccount} />);

      const descriptionInput = screen.getByTestId(
        "input-description"
      ) as HTMLTextAreaElement;
      expect(descriptionInput.value).toBe("We are a test organization");
    });

    it("should display correct placeholder for organization description", () => {
      renderWithProviders(<EditProfileForm account={mockOrganizationAccount} />);

      const descriptionInput = screen.getByTestId(
        "input-description"
      ) as HTMLTextAreaElement;
      expect(descriptionInput.placeholder).toBe(
        "Tell us about your organization"
      );
    });

    it("should include account_id as hidden field", () => {
      renderWithProviders(<EditProfileForm account={mockOrganizationAccount} />);

      const hiddenInput = screen.getByTestId(
        "hidden-account_id"
      ) as HTMLInputElement;
      expect(hiddenInput.value).toBe("test-org");
    });
  });

  describe("Website Management", () => {
    it("should initialize with existing websites from account", () => {
      renderWithProviders(<EditProfileForm account={mockOrganizationAccount} />);

      const websiteInputs = screen.getAllByPlaceholderText("example.com");
      expect(websiteInputs).toHaveLength(2);
      expect((websiteInputs[0] as HTMLInputElement).value).toBe(
        "testorg.com"
      );
      expect((websiteInputs[1] as HTMLInputElement).value).toBe(
        "another-domain.org"
      );
    });

    it("should initialize with one empty website field when no domains exist", () => {
      const accountWithoutDomains = {
        ...mockOrganizationAccount,
        metadata_public: {
          ...mockOrganizationAccount.metadata_public,
          domains: [],
        },
      };

      renderWithProviders(<EditProfileForm account={accountWithoutDomains} />);

      const websiteInputs = screen.getAllByPlaceholderText("example.com");
      expect(websiteInputs).toHaveLength(1);
      expect((websiteInputs[0] as HTMLInputElement).value).toBe("");
    });

    it("should add a new website field when 'Add another website' button is clicked", async () => {
      const user = userEvent.setup();
      renderWithProviders(<EditProfileForm account={mockOrganizationAccount} />);

      const addButton = screen.getByText("Add another website");
      await user.click(addButton);

      await waitFor(() => {
        const websiteInputs = screen.getAllByPlaceholderText("example.com");
        expect(websiteInputs).toHaveLength(3);
      });
    });

    it("should update website value when user types", async () => {
      const user = userEvent.setup();
      renderWithProviders(<EditProfileForm account={mockOrganizationAccount} />);

      const websiteInputs = screen.getAllByPlaceholderText("example.com");
      const firstInput = websiteInputs[0] as HTMLInputElement;

      await user.clear(firstInput);
      await user.type(firstInput, "newdomain.com");

      expect(firstInput.value).toBe("newdomain.com");
    });

    it("should remove website when trash icon is clicked", async () => {
      const user = userEvent.setup();
      const { container } = renderWithProviders(<EditProfileForm account={mockOrganizationAccount} />);

      // Find all trash/delete icons (SVG elements with trash icon path)
      const trashButtons = container.querySelectorAll('svg');
      // Filter for the trash icon SVGs (they have a specific viewBox and path)
      const trashIcons = Array.from(trashButtons).filter(svg =>
        svg.getAttribute('viewBox') === '0 0 15 15'
      );

      // Click the first trash icon
      const firstTrashParent = trashIcons[0].closest('div[style*="cursor: pointer"]');
      if (firstTrashParent) {
        await user.click(firstTrashParent as HTMLElement);
      }

      await waitFor(() => {
        const websiteInputs = screen.getAllByPlaceholderText("example.com");
        expect(websiteInputs).toHaveLength(1);
      });
    });

    it("should not show remove button when there is only one website", () => {
      const accountWithOneDomain = {
        ...mockOrganizationAccount,
        metadata_public: {
          ...mockOrganizationAccount.metadata_public,
          domains: [
            {
              domain: "single-domain.com",
              status: "verified" as const,
              created_at: "2024-01-01T00:00:00Z",
            },
          ],
        },
      };

      renderWithProviders(<EditProfileForm account={accountWithOneDomain} />);

      // The trash icon should not be visible when there's only one website
      const websiteInputs = screen.getAllByPlaceholderText("example.com");
      expect(websiteInputs).toHaveLength(1);

      // Look for the tooltip content which is only rendered when showRemoveButton is true
      expect(screen.queryByText("Remove website")).not.toBeInTheDocument();
    });

    it("should include websites as hidden fields for form submission", () => {
      renderWithProviders(<EditProfileForm account={mockOrganizationAccount} />);

      expect(
        screen.getByTestId("hidden-websites_0")
      ).toHaveAttribute("value", "testorg.com");
      expect(
        screen.getByTestId("hidden-websites_1")
      ).toHaveAttribute("value", "another-domain.org");
    });
  });

  describe("Form Validation", () => {
    it("should mark name field as required", () => {
      renderWithProviders(<EditProfileForm account={mockOrganizationAccount} />);

      const nameField = screen.getByTestId("field-name");
      expect(nameField).toBeInTheDocument();
      expect(screen.getByText("Name (Required)")).toBeInTheDocument();
    });

    it("should have email type for email field", () => {
      renderWithProviders(<EditProfileForm account={mockOrganizationAccount} />);

      const emailInput = screen.getByTestId(
        "input-email"
      ) as HTMLInputElement;
      expect(emailInput.type).toBe("email");
    });

    it("should use textarea for description field", () => {
      renderWithProviders(<EditProfileForm account={mockOrganizationAccount} />);

      const descriptionInput = screen.getByTestId("input-description");
      expect(descriptionInput.tagName).toBe("TEXTAREA");
    });
  });

  describe("Email Handling", () => {
    it("should handle account with no emails", () => {
      const accountWithoutEmails = {
        ...mockOrganizationAccount,
        emails: undefined,
      };

      renderWithProviders(<EditProfileForm account={accountWithoutEmails} />);

      const emailInput = screen.getByTestId(
        "input-email"
      ) as HTMLInputElement;
      expect(emailInput.value).toBe("");
    });

    it("should handle account with no primary email", () => {
      const accountWithNonPrimaryEmail = {
        ...mockOrganizationAccount,
        emails: [
          {
            address: "non-primary@test.com",
            verified: true,
            is_primary: false,
            added_at: "2024-01-01T00:00:00Z",
          },
        ],
      };

      renderWithProviders(<EditProfileForm account={accountWithNonPrimaryEmail} />);

      const emailInput = screen.getByTestId(
        "input-email"
      ) as HTMLInputElement;
      expect(emailInput.value).toBe("");
    });

    it("should use primary email when multiple emails exist", () => {
      const accountWithMultipleEmails = {
        ...mockOrganizationAccount,
        emails: [
          {
            address: "secondary@test.com",
            verified: true,
            is_primary: false,
            added_at: "2024-01-01T00:00:00Z",
          },
          {
            address: "primary@test.com",
            verified: true,
            is_primary: true,
            added_at: "2024-01-01T00:00:00Z",
          },
        ],
      };

      renderWithProviders(<EditProfileForm account={accountWithMultipleEmails} />);

      const emailInput = screen.getByTestId(
        "input-email"
      ) as HTMLInputElement;
      expect(emailInput.value).toBe("primary@test.com");
    });
  });

  describe("Edge Cases", () => {
    it("should handle account with undefined metadata_public", () => {
      const accountWithNoMetadata = {
        ...mockOrganizationAccount,
        metadata_public: undefined as any,
      };

      // Should not throw an error
      expect(() =>
        renderWithProviders(<EditProfileForm account={accountWithNoMetadata} />)
      ).not.toThrow();
    });

    it("should handle account with empty bio", () => {
      const accountWithEmptyBio = {
        ...mockOrganizationAccount,
        metadata_public: {
          ...mockOrganizationAccount.metadata_public,
          bio: "",
        },
      };

      renderWithProviders(<EditProfileForm account={accountWithEmptyBio} />);

      const descriptionInput = screen.getByTestId(
        "input-description"
      ) as HTMLTextAreaElement;
      expect(descriptionInput.value).toBe("");
    });

    it("should handle account with undefined bio", () => {
      const accountWithUndefinedBio = {
        ...mockOrganizationAccount,
        metadata_public: {
          ...mockOrganizationAccount.metadata_public,
          bio: undefined,
        },
      };

      renderWithProviders(<EditProfileForm account={accountWithUndefinedBio} />);

      const descriptionInput = screen.getByTestId(
        "input-description"
      ) as HTMLTextAreaElement;
      expect(descriptionInput.value).toBe("");
    });
  });

  describe("Comparison: Individual vs Organization", () => {
    it("should show different field descriptions based on account type", () => {
      const { rerender } = render(
        <Theme><EditProfileForm account={mockOrganizationAccount} /></Theme>
      );

      expect(
        screen.getByText("Contact email for your organization")
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          "A brief description of your organization (220 characters maximum)"
        )
      ).toBeInTheDocument();

      rerender(
        <Theme><EditProfileForm account={mockIndividualAccount} /></Theme>
      );

      expect(
        screen.getByText("Your primary email address")
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          "A brief description of yourself or your work (220 characters maximum)"
        )
      ).toBeInTheDocument();
    });

    it("should have different field counts for individual vs organization", () => {
      const { rerender } = render(
        <Theme><EditProfileForm account={mockOrganizationAccount} /></Theme>
      );

      // Organization: name, email, description, websites (no ORCID)
      expect(screen.getByTestId("field-name")).toBeInTheDocument();
      expect(screen.getByTestId("field-email")).toBeInTheDocument();
      expect(screen.getByTestId("field-description")).toBeInTheDocument();
      expect(screen.getByTestId("field-websites")).toBeInTheDocument();
      expect(screen.queryByTestId("field-orcid")).not.toBeInTheDocument();

      rerender(
        <Theme><EditProfileForm account={mockIndividualAccount} /></Theme>
      );

      // Individual: name, email, description, orcid, websites
      expect(screen.getByTestId("field-name")).toBeInTheDocument();
      expect(screen.getByTestId("field-email")).toBeInTheDocument();
      expect(screen.getByTestId("field-description")).toBeInTheDocument();
      expect(screen.getByTestId("field-orcid")).toBeInTheDocument();
      expect(screen.getByTestId("field-websites")).toBeInTheDocument();
    });
  });
});
