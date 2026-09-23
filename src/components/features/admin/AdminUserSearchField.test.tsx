import { act, fireEvent, render, screen } from "@testing-library/react";
import { Theme } from "@radix-ui/themes";

const replace = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/admin/user-lookup",
}));

import { AdminUserSearchField } from "./AdminUserSearchField";

const renderField = (query: string) =>
  render(
    <Theme>
      <AdminUserSearchField query={query} />
    </Theme>,
  );

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});
afterEach(() => jest.useRealTimers());

test("a settled edit lands in the URL once", () => {
  renderField("");
  fireEvent.change(screen.getByLabelText("Search users"), {
    target: { value: " nissim " },
  });
  act(() => jest.advanceTimersByTime(400));

  expect(replace).toHaveBeenCalledTimes(1);
  expect(replace).toHaveBeenCalledWith("/admin/user-lookup?q=nissim");
});

test("clearing the field drops the param", () => {
  renderField("jane");
  fireEvent.change(screen.getByLabelText("Search users"), {
    target: { value: "" },
  });
  act(() => jest.advanceTimersByTime(400));

  expect(replace).toHaveBeenCalledWith("/admin/user-lookup");
});

test("a URL change from outside resyncs the field instead of being overwritten", () => {
  // Search "nissim", then the user presses Back and the page re-renders with
  // the previous query. The field must follow the URL, not push "nissim" back.
  const { rerender } = renderField("jane");
  fireEvent.change(screen.getByLabelText("Search users"), {
    target: { value: "nissim" },
  });
  act(() => jest.advanceTimersByTime(400));
  expect(replace).toHaveBeenLastCalledWith("/admin/user-lookup?q=nissim");
  replace.mockClear();

  rerender(
    <Theme>
      <AdminUserSearchField query="jane" />
    </Theme>,
  );
  act(() => jest.advanceTimersByTime(400));

  expect(screen.getByLabelText("Search users")).toHaveValue("jane");
  expect(replace).not.toHaveBeenCalled();
});
