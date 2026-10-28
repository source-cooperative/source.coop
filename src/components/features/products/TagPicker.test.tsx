import { fireEvent, render, screen, within } from "@testing-library/react";
import { Theme } from "@radix-ui/themes";
import { TagPicker } from "./TagPicker";

const submitted = (container: HTMLElement, name = "tags") =>
  [...container.querySelectorAll<HTMLInputElement>(`input[name="${name}"]`)].map(
    (input) => input.value
  );

function renderPicker(defaultValue: string[] = [], suggestName?: string) {
  return render(
    <Theme>
      <TagPicker
        name="tags"
        options={["climate", "climate-change", "ocean"]}
        defaultValue={defaultValue}
        suggestName={suggestName}
      />
    </Theme>
  );
}

function filterFor(text: string) {
  fireEvent.click(screen.getByRole("button", { name: /tags$/ }));
  fireEvent.change(screen.getByPlaceholderText("Filter tags"), {
    target: { value: text },
  });
}

test("submits each chosen tag and drops a removed one", () => {
  const { container } = renderPicker(["ocean", "legacy"]);
  expect(submitted(container)).toEqual(["ocean", "legacy"]);

  fireEvent.click(screen.getByRole("button", { name: "Remove legacy" }));
  expect(submitted(container)).toEqual(["ocean"]);
});

test("the popover filters the corpus and toggles tags", () => {
  const { container } = renderPicker(["ocean"]);
  fireEvent.click(screen.getByRole("button", { name: "Edit tags" }));

  fireEvent.change(screen.getByPlaceholderText("Filter tags"), {
    target: { value: "CLIM" },
  });
  expect(screen.queryByRole("option", { name: "ocean" })).toBeNull();

  fireEvent.click(screen.getByRole("option", { name: "climate-change" }));
  expect(submitted(container)).toEqual(["ocean", "climate-change"]);

  fireEvent.click(screen.getByRole("option", { name: "climate-change" }));
  expect(submitted(container)).toEqual(["ocean"]);
});

test("lists the product's tags first, checked, and keeps them there while open", () => {
  const { container } = renderPicker(["ocean"]);
  fireEvent.click(screen.getByRole("button", { name: "Edit tags" }));
  const pinned = screen.getByRole("group", { name: "On this product" });
  expect(within(pinned).getByRole("option", { name: "ocean" }).getAttribute("aria-selected")).toBe(
    "true"
  );

  // Unchecked, it stays in place rather than jumping to the other group.
  fireEvent.click(within(pinned).getByRole("option", { name: "ocean" }));
  expect(submitted(container)).toEqual([]);
  expect(within(pinned).getByRole("option", { name: "ocean" }).getAttribute("aria-selected")).toBe(
    "false"
  );
});

test("Enter toggles the highlighted tag without submitting the form", () => {
  const onSubmit = jest.fn((e) => e.preventDefault());
  const { container } = render(
    <Theme>
      <form onSubmit={onSubmit}>
        <TagPicker name="tags" options={["climate", "ocean"]} />
      </form>
    </Theme>
  );
  fireEvent.click(screen.getByRole("button", { name: "Add tags" }));
  const input = screen.getByRole("combobox");
  fireEvent.keyDown(input, { key: "ArrowDown" });
  fireEvent.keyDown(input, { key: "Enter" });
  expect(submitted(container)).toEqual(["ocean"]);
  expect(onSubmit).not.toHaveBeenCalled();
});

test("a suggested tag waits for the save, as a new suggest_tags value", () => {
  const { container } = renderPicker(["ocean"], "suggest_tags");
  filterFor("Sea Ice");
  fireEvent.click(screen.getByRole("option", { name: "Suggest “sea-ice” as a new tag" }));

  expect(screen.getByText(/\(new\)/)).toBeTruthy();
  expect(submitted(container)).toEqual(["ocean"]);
  expect(submitted(container, "suggest_tags")).toEqual(["sea-ice"]);

  fireEvent.click(screen.getByRole("button", { name: "Remove sea-ice" }));
  expect(submitted(container, "suggest_tags")).toEqual([]);
});

test("an existing tag can't be suggested", () => {
  renderPicker([], "suggest_tags");
  filterFor("ocean");
  expect(screen.queryByRole("option", { name: /^Suggest/ })).toBeNull();
});

test("a tag the product already carries, though not on the list, can't be suggested", () => {
  renderPicker(["sea-ice"], "suggest_tags");
  filterFor("sea ice");
  expect(screen.queryByRole("option", { name: /^Suggest/ })).toBeNull();
});

test("without suggestName there's no way to suggest", () => {
  renderPicker();
  filterFor("sea ice");
  expect(screen.queryByRole("option", { name: /^Suggest/ })).toBeNull();
});
