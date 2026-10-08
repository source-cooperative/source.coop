import { fireEvent, render, screen } from "@testing-library/react";
import { Theme } from "@radix-ui/themes";
import { TagPicker } from "./TagPicker";

const submitted = (container: HTMLElement) =>
  [...container.querySelectorAll<HTMLInputElement>('input[name="tags"]')].map(
    (input) => input.value
  );

function renderPicker(defaultValue: string[] = []) {
  return render(
    <Theme>
      <TagPicker
        name="tags"
        options={["climate", "climate-change", "ocean"]}
        defaultValue={defaultValue}
      />
    </Theme>
  );
}

test("submits each chosen tag and drops a removed one", () => {
  const { container } = renderPicker(["ocean", "legacy"]);
  expect(submitted(container)).toEqual(["ocean", "legacy"]);

  fireEvent.click(screen.getByRole("button", { name: "Remove legacy" }));
  expect(submitted(container)).toEqual(["ocean"]);
});

test("typing a tag's prefix doesn't add it; Enter adds an exact match", () => {
  const { container } = renderPicker();
  const input = screen.getByPlaceholderText("Add a tag");

  fireEvent.input(input, {
    target: { value: "climate" },
    inputType: "insertText",
  });
  expect(submitted(container)).toEqual([]);

  fireEvent.input(input, { target: { value: "Made-up" } });
  fireEvent.keyDown(input, { key: "Enter" });
  expect(submitted(container)).toEqual([]);

  fireEvent.input(input, {
    target: { value: "CLIMATE" },
    inputType: "insertText",
  });
  fireEvent.keyDown(input, { key: "Enter" });
  expect(submitted(container)).toEqual(["climate"]);
});

test("picking a suggestion adds it at once", () => {
  const { container } = renderPicker();
  fireEvent.input(screen.getByPlaceholderText("Add a tag"), {
    target: { value: "ocean" },
    inputType: "insertReplacementText",
  });
  expect(submitted(container)).toEqual(["ocean"]);
});
