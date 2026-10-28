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

test("leaves out an empty tag a product carries", () => {
  const { container } = renderPicker(["", "ocean"]);
  expect(submitted(container)).toEqual(["ocean"]);
  expect(screen.queryByRole("button", { name: "Remove " })).toBeNull();
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
  expect(within(groups[0]).getAllByRole("option").map((o) => o.textContent)).toEqual([
    "ocean",
    "climate",
  ]);
  expect(
    screen.getByRole("group", { name: "Format", description: "How the files are stored." })
  ).toBeTruthy();
});

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

  // Checked, it is listed twice: with the product's tags, and where it was.
  fireEvent.click(screen.getAllByRole("option", { name: "climate-change" })[1]);
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

test("adds a tag checked while open to the product's tags, leaving it in its category", () => {
  render(
    <Theme>
      <TagPicker
        name="tags"
        options={["climate", "ocean"]}
        categories={{ climate: "domain", ocean: "domain" }}
        defaultValue={["ocean"]}
      />
    </Theme>
  );
  fireEvent.click(screen.getByRole("button", { name: "Edit tags" }));
  const domain = screen.getByRole("group", { name: "Domain" });
  fireEvent.click(within(domain).getByRole("option", { name: "climate" }));

  const pinned = screen.getByRole("group", { name: "On this product" });
  expect(within(pinned).getAllByRole("option").map((o) => o.textContent)).toEqual([
    "ocean",
    "climate",
  ]);
  expect(within(domain).getByRole("option", { name: "climate" }).getAttribute("aria-selected")).toBe(
    "true"
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

describe("tags suggested from the product's data", () => {
  const renderRecommended = (suggestName?: string, defaultValue: string[] = []) =>
    render(
      <Theme>
        <TagPicker
          name="tags"
          options={["agriculture", "boundaries", "field", "ocean"]}
          defaultValue={defaultValue}
          suggestName={suggestName}
          recommended={["Agriculture", "field-boundaries", "land-parcels", "ocean"]}
        />
      </Theme>
    );
  const offered = () =>
    within(screen.getByRole("group", { name: "Suggested from this product's data" }))
      .getAllByRole("button")
      .map((b) => b.textContent);

  test("offers each keyword as the tags it matches, or as a new one", () => {
    renderRecommended("suggest_tags", ["ocean"]);
    // ocean is already on the product, so it isn't offered.
    expect(offered()).toEqual([
      "agriculture",
      "field + boundaries",
      "land-parcels (new)",
      "Add the 2 existing tags",
    ]);
  });

  test("a click adds the matched tags, or suggests a new one", () => {
    const { container } = renderRecommended("suggest_tags");
    fireEvent.click(screen.getByRole("button", { name: "field + boundaries" }));
    fireEvent.click(screen.getByRole("button", { name: "land-parcels (new)" }));
    expect(submitted(container)).toEqual(["field", "boundaries"]);
    expect(submitted(container, "suggest_tags")).toEqual(["land-parcels"]);
    expect(screen.queryByRole("button", { name: "field + boundaries" })).toBeNull();
  });

  test("adding the existing tags at once suggests nothing", () => {
    const { container } = renderRecommended("suggest_tags");
    fireEvent.click(screen.getByRole("button", { name: "Add the 3 existing tags" }));
    expect(submitted(container)).toEqual(["agriculture", "field", "boundaries", "ocean"]);
    expect(submitted(container, "suggest_tags")).toEqual([]);
  });

  test("without suggestName only matches are offered", () => {
    renderRecommended();
    expect(offered()).not.toContain("land-parcels (new)");
    expect(offered()).toContain("Add all");
  });
});
