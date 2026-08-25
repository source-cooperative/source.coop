import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Dialog, Theme } from "@radix-ui/themes";
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

  it("keeps searching after choosing the handle that was typed in full", async () => {
    // Typing a handle out and then confirming it from the list writes back the
    // value already in the input. Suppressing "the search for what was just
    // chosen" must not outlive that non-event and swallow the next real edit.
    const user = userEvent.setup();
    renderInput();

    const input = screen.getByRole("combobox");
    await user.type(input, "jane-doe");
    await user.click(await screen.findByText("Jane Doe"));

    await user.type(input, "x");

    await waitFor(() => {
      expect(mockSearchAccounts).toHaveBeenCalledWith("jane-doex");
    });
  });

  it("escapes the dialog it sits in rather than being clipped by it", async () => {
    // The invite form is a Dialog, whose content is its own scroll box: a list
    // positioned inside the field was cut off at the dialog's edge. It has to
    // portal out -- and still be reachable, since a modal marks everything
    // outside it aria-hidden.
    const user = userEvent.setup();
    render(
      <Theme>
        <Dialog.Root defaultOpen>
          <Dialog.Content>
            <Dialog.Title>Invite New Member</Dialog.Title>
            <AccountSearchInput name="account_id" />
          </Dialog.Content>
        </Dialog.Root>
      </Theme>
    );

    const input = screen.getByRole("combobox");
    await user.type(input, "jane");

    const options = await screen.findAllByRole("option");
    expect(options[0].closest('[role="dialog"]')).toBeNull();

    await user.click(screen.getByText("Janet Reyes"));
    expect(input).toHaveValue("janet-r");
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
