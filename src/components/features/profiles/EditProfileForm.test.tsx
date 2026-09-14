import { render, screen } from "@testing-library/react";
import { Theme } from "@radix-ui/themes";
import { EditProfileForm } from "./EditProfileForm";
import { Account, AccountType } from "@/types";

// DynamicForm calls React 19's useActionState. Next and Storybook run the React
// that Next bundles; Jest resolves the React 18 in package.json, where the hook
// does not exist. The form here is never submitted, so the idle tuple is enough.
jest.mock("react", () => {
  const react = jest.requireActual("react");
  react.useActionState = (_action: unknown, initialState: unknown) => [
    initialState,
    () => {},
    false,
  ];
  return react;
});

jest.mock("@/lib/actions/account", () => ({
  updateAccountProfile: jest.fn(),
}));

const account = (type: AccountType): Account =>
  ({
    account_id: "an-account",
    name: "An Account",
    type,
    emails: [
      { address: "contact@example.test", is_primary: true, verified: true },
    ],
    metadata_public: {},
  }) as Account;

const emailField = (type: AccountType) => {
  render(
    <Theme>
      <EditProfileForm account={account(type)} />
    </Theme>
  );
  return screen.getByLabelText("Email");
};

describe("EditProfileForm email field", () => {
  it("is read-only for an individual, whose email comes from their identity", () => {
    expect(emailField(AccountType.INDIVIDUAL)).toBeDisabled();
  });

  it("is editable for an organization, whose email is a contact address", () => {
    expect(emailField(AccountType.ORGANIZATION)).toBeEnabled();
  });

  it("seeds the field with the account's primary email", () => {
    expect(emailField(AccountType.ORGANIZATION)).toHaveValue(
      "contact@example.test"
    );
  });
});
