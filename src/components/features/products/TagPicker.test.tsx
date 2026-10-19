import { fireEvent, render, screen } from "@testing-library/react";
import { Theme } from "@radix-ui/themes";
import { TagPicker } from "./TagPicker";

const submitted = (container: HTMLElement) =>
  [...container.querySelectorAll<HTMLInputElement>('input[name="tags"]')].map(
    (input) => input.value
  );

function renderPicker(
  defaultValue: string[] = [],
  onSuggest?: (tag: string) => Promise<{ tag: string } | { error: string }>
) {
  return render(
    <Theme>
      <TagPicker
        name="tags"
        options={["climate", "climate-change", "ocean"]}
        defaultValue={defaultValue}
        onSuggest={onSuggest}
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

test("a suggested tag is added and marked pending", async () => {
  const onSuggest = jest.fn(async () => ({ tag: "sea-ice" }));
  const { container } = renderPicker(["ocean"], onSuggest);
  filterFor("Sea Ice");

  fireEvent.click(
    screen.getByRole("button", { name: "Suggest “sea-ice” as a new tag" })
  );

  expect(await screen.findByText(/\(pending\)/)).toBeTruthy();
  expect(onSuggest).toHaveBeenCalledWith("Sea Ice");
  expect(submitted(container)).toEqual(["ocean", "sea-ice"]);
});

test("a refused suggestion shows why and adds nothing", async () => {
  const { container } = renderPicker([], async () => ({ error: "Too many" }));
  filterFor("sea ice");

  fireEvent.click(screen.getByRole("button", { name: /^Suggest/ }));

  expect((await screen.findByRole("alert")).textContent).toBe("Too many");
  expect(submitted(container)).toEqual([]);
});

test("the list groups tags under their categories, in category order", () => {
  render(
    <Theme>
      <TagPicker
        name="tags"
        options={["cog", "ocean", "climate", "misc"]}
        categories={{ cog: "format", ocean: "domain", climate: "domain" }}
      />
    </Theme>
  );
  filterFor("");

  const groups = screen.getAllByRole("group");
  expect(groups.map((g) => g.getAttribute("aria-label"))).toEqual([
    "Domain",
    "Format",
    "Other",
  ]);
  expect(groups[0].textContent).toBe(
    "DomainThe subject the data is about.oceanclimate"
  );
  expect(
    screen.getByRole("group", {
      name: "Format",
      description: "How the files are stored.",
    })
  ).toBeTruthy();
});

test("a filter with spaces matches hyphenated tags", () => {
  render(
    <Theme>
      <TagPicker name="tags" options={["field-boundaries", "ocean"]} />
    </Theme>
  );
  filterFor("Field Bound");
  expect(screen.getByRole("checkbox", { name: "field-boundaries" })).toBeTruthy();
  expect(screen.queryByRole("checkbox", { name: "ocean" })).toBeNull();
});

test("an existing tag can't be suggested", () => {
  renderPicker([], async (tag) => ({ tag }));
  filterFor("ocean");
  expect(screen.queryByRole("button", { name: /^Suggest/ })).toBeNull();
});
