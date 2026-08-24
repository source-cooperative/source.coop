import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Theme } from "@radix-ui/themes";
import { AccountSearchInput } from "./AccountSearchInput";
import { searchAccounts } from "@/lib/actions/account";

jest.mock("@/lib/actions/account", () => ({
  searchAccounts: jest.fn(),
}));

const mockSearchAccounts = searchAccounts as jest.MockedFunction<
  typeof searchAccounts
>;

describe("AccountSearchInput", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchAccounts.mockResolvedValue([
      { account_id: "jane-doe", name: "Jane Doe" },
    ]);
  });

  it("offers matching accounts as datalist options, keyed by handle", async () => {
    const user = userEvent.setup();
    render(
      <Theme>
        <AccountSearchInput name="account_id" />
      </Theme>
    );

    await user.type(screen.getByRole("combobox"), "jane");

    await waitFor(() => {
      expect(mockSearchAccounts).toHaveBeenCalledWith("jane");
    });

    const option = await screen.findByText("Jane Doe");
    expect(option).toHaveValue("jane-doe");
    // The <datalist> is what makes the browser render the suggestions.
    expect(option.closest("datalist")?.id).toBe(
      screen.getByRole("combobox").getAttribute("list")
    );
  });
});
