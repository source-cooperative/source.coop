import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Theme } from "@radix-ui/themes";
import { AdminTagSuggestions, type TagSuggestion } from "./AdminTagSuggestions";

function renderQueue(
  suggestion: Partial<TagSuggestion> = {},
  action = jest.fn(async () => ({}))
) {
  render(
    <Theme>
      <AdminTagSuggestions
        approved={[
          { tag: "crop-type", products: 12 },
          { tag: "crops", products: 12 },
          { tag: "field", products: 115 },
          { tag: "boundaries", products: 121 },
        ]}
        suggestions={[
          {
            tag: "crop-types",
            suggested_by: "fiboa",
            products: [{ account_id: "fiboa", product_id: "de-nrw" }],
            matches: [
              { tag: "crop-type", score: 0.85 },
              { tag: "crops", score: 0.65 },
            ],
            ...suggestion,
          },
        ]}
        action={action}
      />
    </Theme>
  );
  return action;
}

const sent = (action: jest.Mock) => {
  const form = action.mock.calls[0][0] as FormData;
  return { ...Object.fromEntries(form), into: form.getAll("into") };
};

test("choosing a match only stages the merge; Reset goes back", () => {
  const action = renderQueue();
  fireEvent.click(screen.getByRole("button", { name: "crop-type" }));

  expect(screen.getByText(/Saving replaces/)).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Reject" })).toBeNull();
  expect(action).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole("button", { name: "Reset" }));
  expect(screen.queryByText(/Saving replaces/)).toBeNull();
  expect(screen.getByRole("button", { name: "Approve as a new tag" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Reject" })).toBeTruthy();
});

test("Save merge sends every target chosen", async () => {
  const action = renderQueue();
  fireEvent.click(screen.getByRole("button", { name: "crop-type" }));
  fireEvent.click(screen.getByRole("button", { name: "crops" }));
  expect(screen.getByText(/Saving replaces/).textContent).toContain(
    "with crop-type and crops"
  );

  fireEvent.click(screen.getByRole("button", { name: "Save merge" }));
  await waitFor(() => expect(action).toHaveBeenCalled());
  expect(sent(action)).toEqual({
    tag: "crop-types",
    decision: "merge",
    into: ["crop-type", "crops"],
  });
});

test("choosing a staged match again takes it off", () => {
  renderQueue();
  fireEvent.click(screen.getByRole("button", { name: "crop-type" }));
  fireEvent.click(screen.getByRole("button", { name: "crop-type" }));
  expect(screen.queryByText(/Saving replaces/)).toBeNull();
});

test("the split button stages a merge into each of its words", async () => {
  const action = renderQueue({
    tag: "field-boundaries",
    matches: [],
    split: ["field", "boundaries"],
  });
  fireEvent.click(screen.getByRole("button", { name: "field + boundaries" }));
  fireEvent.click(screen.getByRole("button", { name: "Save merge" }));

  await waitFor(() => expect(action).toHaveBeenCalled());
  expect(sent(action).into).toEqual(["field", "boundaries"]);
});

test("approve and reject act at once, and a refusal is shown", async () => {
  const action = renderQueue({}, jest.fn(async () => ({ error: "Not awaiting review" })));
  fireEvent.click(screen.getByRole("button", { name: "Reject" }));

  expect((await screen.findByRole("alert")).textContent).toBe("Not awaiting review");
  expect(sent(action)).toEqual({ tag: "crop-types", decision: "reject", into: [] });
});
