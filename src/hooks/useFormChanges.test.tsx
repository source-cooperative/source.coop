import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { useFormChanges } from "./useFormChanges";

function Form({ lastSave }: { lastSave?: unknown }) {
  const { formRef, dirty } = useFormChanges(lastSave);
  const [chips, setChips] = useState<string[]>(["ocean"]);
  return (
    <form ref={formRef}>
      <input aria-label="Title" name="title" defaultValue="Rivers" />
      {chips.map((tag) => (
        <input key={tag} type="hidden" name="tags" value={tag} />
      ))}
      {/* An empty file input still submits a placeholder file, whose
          modification time is the moment it's read: it mustn't count. */}
      <input aria-label="File" name="file" type="file" />
      <button type="button" onClick={() => setChips([...chips, "climate"])}>
        Add tag
      </button>
      <output>{dirty ? "unsaved" : "clean"}</output>
    </form>
  );
}

const status = () => screen.getByRole("status").textContent;

test("is dirty while the form differs from what it loaded", () => {
  render(<Form />);
  expect(status()).toBe("clean");

  fireEvent.input(screen.getByLabelText("Title"), { target: { value: "Lakes" } });
  expect(status()).toBe("unsaved");

  fireEvent.input(screen.getByLabelText("Title"), { target: { value: "Rivers" } });
  expect(status()).toBe("clean");
});

test("notices hidden inputs that change without an input event", async () => {
  render(<Form />);
  fireEvent.click(screen.getByText("Add tag"));
  await waitFor(() => expect(status()).toBe("unsaved"));
});

test("a successful save makes what the form holds the saved state", () => {
  const { rerender } = render(<Form />);
  fireEvent.input(screen.getByLabelText("Title"), { target: { value: "Lakes" } });
  expect(status()).toBe("unsaved");

  act(() => rerender(<Form lastSave={{ success: true }} />));
  expect(status()).toBe("clean");
});

test("an edit made while a save is on its way stays unsaved", () => {
  const { container, rerender } = render(<Form />);
  const title = screen.getByLabelText("Title");
  fireEvent.input(title, { target: { value: "Lakes" } });
  fireEvent.submit(container.querySelector("form")!);
  fireEvent.input(title, { target: { value: "Lakes and rivers" } });

  act(() => rerender(<Form lastSave={{ success: true }} />));
  expect(status()).toBe("unsaved");

  fireEvent.input(title, { target: { value: "Lakes" } });
  expect(status()).toBe("clean");
});
