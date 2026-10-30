import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Theme } from "@radix-ui/themes";
import { AdminTagList } from "./AdminTagList";

// Radix's Table scrolls in a ScrollArea, which observes its size; jsdom has
// no ResizeObserver.
global.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const TAGS = [
  { tag: "boundaries", products: 121 },
  { tag: "machine learning", products: 7 },
  { tag: "field-boundaries", products: 3 },
];

const renderList = (action = jest.fn().mockResolvedValue({})) => {
  render(
    <Theme>
      <AdminTagList tags={TAGS} taken={{ oceans: "merged" }} action={action} />
    </Theme>
  );
  return action;
};

/** The fields of the form the action was sent, multi-valued ones as arrays. */
const sent = (action: jest.Mock) => {
  const form: FormData = action.mock.calls[0][0];
  return { ...Object.fromEntries(form), into: form.getAll("into") };
};

const openReplace = async (tag: string) => {
  const row = screen.getByRole("rowheader", { name: tag }).closest("tr")!;
  await userEvent.click(within(row).getByRole("button", { name: "Replace" }));
  return within(await screen.findByRole("dialog"));
};

test("each tag links to the product list filtered by it", () => {
  renderList();
  expect(screen.getByRole("link", { name: "boundaries" }).getAttribute("href")).toBe(
    "/products?tags=boundaries"
  );
  expect(
    screen.getByRole("link", { name: "machine learning" }).getAttribute("href")
  ).toBe("/products?tags=machine%20learning");
});

test("splits a tag into an approved one and a new name", async () => {
  const action = renderList();
  const popover = await openReplace("field-boundaries");
  await userEvent.click(popover.getByRole("option", { name: /^boundaries/ }));
  await userEvent.type(popover.getByPlaceholderText(/type a new name/), "Field");
  await userEvent.click(popover.getByRole("option", { name: "Add new tag “field”" }));
  await userEvent.click(popover.getByRole("button", { name: "Save" }));

  expect(sent(action)).toEqual({
    tag: "field-boundaries",
    decision: "merge",
    approved: "true",
    into: ["boundaries", "field"],
  });
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
});

test("doesn't offer a tag off the list as a new name, and says why", async () => {
  renderList();
  const popover = await openReplace("boundaries");
  await userEvent.type(popover.getByPlaceholderText(/type a new name/), "oceans");
  expect(popover.queryByRole("option", { name: /oceans/ })).toBeNull();
  expect(popover.getByText("“oceans” is merged, so it can't be a new name.")).toBeTruthy();
});

test("removes a tag, and shows why a change was refused", async () => {
  const action = renderList(jest.fn().mockResolvedValue({ error: "nothing was changed" }));
  const popover = await openReplace("boundaries");
  await userEvent.click(popover.getByRole("button", { name: "Remove from 121 products" }));

  expect(sent(action)).toMatchObject({ decision: "reject", approved: "true", into: [] });
  expect((await popover.findByRole("alert")).textContent).toBe("nothing was changed");
});
