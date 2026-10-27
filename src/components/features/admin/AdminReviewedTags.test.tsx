import { fireEvent, render, screen } from "@testing-library/react";
import { Theme } from "@radix-ui/themes";
import { AdminReviewedTags } from "./AdminReviewedTags";

function renderReviewed(action = jest.fn(async () => ({}))) {
  render(
    <Theme>
      <AdminReviewedTags
        reviewed={[
          {
            tag: "field-boundaries",
            outcome: "merged",
            merged_into: ["field", "boundaries"],
            reviewed_by: "alukach",
            reviewed_at: "2026-10-27T15:00:00Z",
            products: 3,
          },
          { tag: "asdf", outcome: "rejected", reviewed_by: "alukach", products: 1 },
          { tag: "sea-ice", outcome: "approved", reviewed_by: "alukach", products: 2 },
        ]}
        action={action}
      />
    </Theme>
  );
  return action;
}

test("says what each decision was", () => {
  renderReviewed();
  expect(screen.getByText("Merged into field + boundaries on 3 products")).toBeTruthy();
  expect(screen.getByText("Rejected, taken off 1 product")).toBeTruthy();
  expect(screen.getByText("Approved")).toBeTruthy();
});

test("Undo sends an undo for that tag, and shows a refusal", async () => {
  const action = renderReviewed(jest.fn(async () => ({ error: "No decision to undo" })));
  fireEvent.click(screen.getAllByRole("button", { name: "Undo" })[1]);

  expect((await screen.findByRole("alert")).textContent).toBe("No decision to undo");
  expect(Object.fromEntries(action.mock.calls[0][0] as FormData)).toEqual({
    tag: "asdf",
    decision: "undo",
  });
});
