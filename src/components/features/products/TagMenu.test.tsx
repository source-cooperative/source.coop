import { fireEvent, render, screen } from "@testing-library/react";
import { Theme } from "@radix-ui/themes";
import { TagMenu } from "./TagMenu";

const renderMenu = (props: Partial<Parameters<typeof TagMenu>[0]> = {}) => {
  const onChoose = jest.fn();
  const suggest = jest.fn();
  render(
    <Theme>
      <TagMenu
        query=""
        onQueryChange={() => {}}
        placeholder="Find a tag"
        sections={[
          { title: "Close matches", items: [{ tag: "boundaries", detail: "113 products" }] },
          { title: "All tags", items: [{ tag: "climate" }, { tag: "ocean" }] },
          { title: "Empty", items: [] },
        ]}
        onChoose={onChoose}
        action={{ label: "Suggest it", onChoose: suggest }}
        empty="Nothing"
        {...props}
      />
    </Theme>
  );
  return { onChoose, suggest, input: screen.getByRole("combobox") };
};

const active = () =>
  document.getElementById(screen.getByRole("combobox").getAttribute("aria-activedescendant")!)!
    .textContent;

test("groups tags under their titles, leaving out an empty group", () => {
  renderMenu();
  expect(screen.getAllByRole("group").map((g) => g.getAttribute("aria-label"))).toEqual([
    "Close matches",
    "All tags",
  ]);
  expect(screen.getByRole("option", { name: /boundaries/ }).textContent).toContain(
    "113 products"
  );
});

test("arrow keys move the highlight across groups to the action, wrapping", () => {
  const { input, suggest } = renderMenu();
  expect(active()).toContain("boundaries");
  fireEvent.keyDown(input, { key: "ArrowDown" });
  fireEvent.keyDown(input, { key: "ArrowDown" });
  expect(active()).toBe("ocean");
  fireEvent.keyDown(input, { key: "ArrowDown" });
  fireEvent.keyDown(input, { key: "Enter" });
  expect(suggest).toHaveBeenCalled();
  fireEvent.keyDown(input, { key: "ArrowDown" });
  expect(active()).toContain("boundaries");
  fireEvent.keyDown(input, { key: "ArrowUp" });
  expect(active()).toBe("Suggest it");
});

test("Enter and a click choose the tag", () => {
  const { input, onChoose } = renderMenu();
  fireEvent.keyDown(input, { key: "Enter" });
  expect(onChoose).toHaveBeenLastCalledWith("boundaries");
  fireEvent.click(screen.getByRole("option", { name: "climate" }));
  expect(onChoose).toHaveBeenLastCalledWith("climate");
});

test("says so when nothing matches", () => {
  renderMenu({ sections: [], action: undefined });
  expect(screen.getByText("Nothing")).toBeTruthy();
});
