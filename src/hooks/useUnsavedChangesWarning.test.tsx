import { fireEvent, render, screen } from "@testing-library/react";
import { useUnsavedChangesWarning } from "./useUnsavedChangesWarning";

// Stands in for next/link: a React click handler that navigates in place.
const navigate = jest.fn();

function Page({ dirty }: { dirty: boolean }) {
  useUnsavedChangesWarning(() => dirty);
  const link = (href: string, label: string, props = {}) => (
    <a
      href={href}
      {...props}
      onClick={(e) => {
        e.preventDefault();
        navigate(href);
      }}
    >
      {label}
    </a>
  );
  return (
    <>
      {link("/products", "Products")}
      {link("#details", "Details")}
      {link("/products", "New tab", { target: "_blank" })}
    </>
  );
}

beforeEach(() => {
  navigate.mockReset();
  jest.spyOn(window, "confirm").mockReset();
});

test("asks before an in-app link leaves unsaved changes, and stays on Cancel", () => {
  const confirm = jest.spyOn(window, "confirm").mockReturnValue(false);
  render(<Page dirty />);

  fireEvent.click(screen.getByText("Products"));

  expect(confirm).toHaveBeenCalledTimes(1);
  expect(navigate).not.toHaveBeenCalled();
});

test("leaves when the person confirms", () => {
  jest.spyOn(window, "confirm").mockReturnValue(true);
  render(<Page dirty />);
  fireEvent.click(screen.getByText("Products"));
  expect(navigate).toHaveBeenCalledWith("/products");
});

test("doesn't ask without unsaved changes, for a fragment, or for a new tab", () => {
  const confirm = jest.spyOn(window, "confirm");
  const { rerender } = render(<Page dirty={false} />);
  fireEvent.click(screen.getByText("Products"));

  rerender(<Page dirty />);
  fireEvent.click(screen.getByText("Details"));
  fireEvent.click(screen.getByText("New tab"));
  fireEvent.click(screen.getByText("Products"), { metaKey: true });

  expect(confirm).not.toHaveBeenCalled();
  expect(navigate).toHaveBeenCalledTimes(4);
});

test("asks the browser to warn before unloading only while dirty", () => {
  const { rerender } = render(<Page dirty={false} />);
  const clean = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(clean);
  expect(clean.defaultPrevented).toBe(false);

  rerender(<Page dirty />);
  const dirty = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(dirty);
  expect(dirty.defaultPrevented).toBe(true);
});
