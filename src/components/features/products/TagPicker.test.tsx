import { fireEvent, render, screen } from "@testing-library/react";
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
  expect(screen.queryByRole("checkbox", { name: "ocean" })).toBeNull();

  fireEvent.click(screen.getByRole("checkbox", { name: "climate-change" }));
  expect(submitted(container)).toEqual(["ocean", "climate-change"]);

  fireEvent.click(screen.getByRole("checkbox", { name: "climate-change" }));
  expect(submitted(container)).toEqual(["ocean"]);
});

test("a suggested tag waits for the save, as a new suggest_tags value", () => {
  const { container } = renderPicker(["ocean"], "suggest_tags");
  filterFor("Sea Ice");
  fireEvent.click(
    screen.getByRole("button", { name: "Suggest “sea-ice” as a new tag" })
  );

  expect(screen.getByText(/\(new\)/)).toBeTruthy();
  expect(screen.getByText(/suggested for review when you save/)).toBeTruthy();
  expect(submitted(container)).toEqual(["ocean"]);
  expect(submitted(container, "suggest_tags")).toEqual(["sea-ice"]);

  fireEvent.click(screen.getByRole("button", { name: "Remove sea-ice" }));
  expect(submitted(container, "suggest_tags")).toEqual([]);
  expect(screen.queryByText(/suggested for review when you save/)).toBeNull();
});

test("an existing tag can't be suggested", () => {
  renderPicker([], "suggest_tags");
  filterFor("ocean");
  expect(screen.queryByRole("button", { name: /^Suggest/ })).toBeNull();
});

test("without suggestName there's no way to suggest", () => {
  renderPicker();
  filterFor("sea ice");
  expect(screen.queryByRole("button", { name: /^Suggest/ })).toBeNull();
});
