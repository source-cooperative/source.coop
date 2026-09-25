import { act, fireEvent, render, screen } from "@testing-library/react";
import { Theme } from "@radix-ui/themes";

const mockReplace = jest.fn();
// One router object for the whole suite: the component keys an effect on it,
// so a fresh object per render would re-fire that effect forever.
const mockRouter = { replace: mockReplace };
jest.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
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

  expect(mockReplace).toHaveBeenCalledTimes(1);
  expect(mockReplace).toHaveBeenCalledWith("/admin/user-lookup?q=nissim");
});

test("clearing the field drops the param", () => {
  renderField("jane");
  fireEvent.change(screen.getByLabelText("Search users"), {
    target: { value: "" },
  });
  act(() => jest.advanceTimersByTime(400));

  expect(mockReplace).toHaveBeenCalledWith("/admin/user-lookup");
});

test("a URL change from outside resyncs the field instead of being overwritten", () => {
  // Search "nissim", then the user presses Back and the page re-renders with
  // the previous query. The field must follow the URL, not push "nissim" back.
  const { rerender } = renderField("jane");
  fireEvent.change(screen.getByLabelText("Search users"), {
    target: { value: "nissim" },
  });
  act(() => jest.advanceTimersByTime(400));
  expect(mockReplace).toHaveBeenLastCalledWith("/admin/user-lookup?q=nissim");
  mockReplace.mockClear();

  // The page re-renders for the URL the field just set, then for the one Back
  // restores.
  rerender(
    <Theme>
      <AdminUserSearchField query="nissim" />
    </Theme>,
  );
  rerender(
    <Theme>
      <AdminUserSearchField query="jane" />
    </Theme>,
  );
  act(() => jest.advanceTimersByTime(400));

  expect(screen.getByLabelText("Search users")).toHaveValue("jane");
  expect(mockReplace).not.toHaveBeenCalled();
});
