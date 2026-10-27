import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Theme } from "@radix-ui/themes";
import { AdminTagSuggestions } from "./AdminTagSuggestions";

function renderQueue(action = jest.fn(async () => ({}))) {
  render(
    <Theme>
      <AdminTagSuggestions
        approved={[
          { tag: "crop-type", products: 12 },
          { tag: "ocean", products: 5 },
        ]}
        suggestions={[
          {
            tag: "crop-types",
            suggested_by: "fiboa",
            products: [{ account_id: "fiboa", product_id: "de-nrw" }],
            matches: [{ tag: "crop-type", score: 0.85 }],
          },
        ]}
        action={action}
      />
    </Theme>
  );
  return action;
}

const sent = (action: jest.Mock) =>
  Object.fromEntries(action.mock.calls[0][0] as FormData);

test("choosing a match only stages the merge; Keep goes back", () => {
  const action = renderQueue();
  fireEvent.click(screen.getByRole("button", { name: "crop-type" }));

  expect(screen.getByText(/Saving replaces/)).toBeTruthy();
  expect(action).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole("button", { name: "Keep “crop-types”" }));
  expect(screen.queryByText(/Saving replaces/)).toBeNull();
  expect(screen.getByRole("button", { name: "Approve as a new tag" })).toBeTruthy();
});

test("Save merge sends the merge with its target", async () => {
  const action = renderQueue();
  fireEvent.click(screen.getByRole("button", { name: "crop-type" }));
  fireEvent.click(screen.getByRole("button", { name: "Save merge" }));

  await waitFor(() => expect(action).toHaveBeenCalled());
  expect(sent(action)).toEqual({ tag: "crop-types", decision: "merge", into: "crop-type" });
});

test("approve and reject act at once, and a refusal is shown", async () => {
  const action = renderQueue(jest.fn(async () => ({ error: "Not awaiting review" })));
  fireEvent.click(screen.getByRole("button", { name: "Reject" }));

  expect((await screen.findByRole("alert")).textContent).toBe("Not awaiting review");
  expect(sent(action)).toEqual({ tag: "crop-types", decision: "reject" });
});
