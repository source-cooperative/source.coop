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

const renderInput = () =>
  render(
    <Theme>
      <AccountSearchInput name="account_id" />
    </Theme>
  );

describe("AccountSearchInput", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchAccounts.mockResolvedValue([
      { account_id: "jane-doe", name: "Jane Doe" },
      { account_id: "janet-r", name: "Janet Reyes" },
    ]);
  });

  it("shows each match as an account card, name and handle", async () => {
    const user = userEvent.setup();
    renderInput();

    await user.type(screen.getByRole("combobox"), "jane");

    await waitFor(() => {
      expect(mockSearchAccounts).toHaveBeenCalledWith("jane");
    });

    const options = await screen.findAllByRole("option");
    expect(options).toHaveLength(2);
    expect(options[0]).toHaveTextContent("Jane Doe");
    // The handle is what identifies the account, so it is on the card too --
    // two people can share a display name.
    expect(options[0]).toHaveTextContent("@jane-doe");
  });

  it("submits the handle, not the display name, when a match is clicked", async () => {
    const user = userEvent.setup();
    renderInput();

    const input = screen.getByRole("combobox");
    await user.type(input, "jane");

    const option = await screen.findByText("Janet Reyes");
    await user.click(option);

    expect(input).toHaveValue("janet-r");
  });

  it("chooses with the keyboard without focus leaving the input", async () => {
    const user = userEvent.setup();
    renderInput();

    const input = screen.getByRole("combobox");
    await user.type(input, "jane");
    await screen.findAllByRole("option");

    await user.keyboard("{ArrowDown}{ArrowDown}{Enter}");

    expect(input).toHaveValue("janet-r");
    expect(input).toHaveFocus();
  });

  it("does not search again for the account just chosen", async () => {
    const user = userEvent.setup();
    renderInput();

    await user.type(screen.getByRole("combobox"), "jane");
    await user.click(await screen.findByText("Jane Doe"));

    await waitFor(() => {
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });
    // "jane" only. Writing the handle into the input must not read as typing.
    expect(mockSearchAccounts).not.toHaveBeenCalledWith("jane-doe");
  });

  it("reports busy while the lookup is outstanding, and stops when it lands", async () => {
    const user = userEvent.setup();
    let resolve: (value: Awaited<ReturnType<typeof searchAccounts>>) => void =
      () => {};
    mockSearchAccounts.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      })
    );

    renderInput();
    const input = screen.getByRole("combobox");
    await user.type(input, "jane");

    // aria-busy rather than the spinner element: the spinner is decorative, and
    // its markup is Radix's to change.
    await waitFor(() => expect(input).toHaveAttribute("aria-busy", "true"));

    resolve([{ account_id: "jane-doe", name: "Jane Doe" }]);

    await waitFor(() => expect(input).toHaveAttribute("aria-busy", "false"));
  });

  it("stays quiet until there is enough to match on", async () => {
    const user = userEvent.setup();
    renderInput();

    await user.type(screen.getByRole("combobox"), "j");
    // Past the debounce, so this fails if a one-character query is merely slow
    // rather than actually suppressed.
    await new Promise((resolve) => setTimeout(resolve, 400));

    // A single character matches most of the table; the round trip is waste.
    expect(mockSearchAccounts).not.toHaveBeenCalled();
  });
});
