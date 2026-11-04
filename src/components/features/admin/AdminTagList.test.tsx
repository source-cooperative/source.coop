import { render, screen } from "@testing-library/react";
import { Theme } from "@radix-ui/themes";
import { AdminTagList } from "./AdminTagList";

test("each tag links to the product list filtered by it", () => {
  render(
    <Theme>
      <AdminTagList
        tags={[
          { tag: "boundaries", products: 121 },
          { tag: "machine learning", products: 7 },
        ]}
      />
    </Theme>
  );
  expect(screen.getByRole("link", { name: "boundaries" }).getAttribute("href")).toBe(
    "/products?tags=boundaries"
  );
  expect(
    screen.getByRole("link", { name: "machine learning" }).getAttribute("href")
  ).toBe("/products?tags=machine%20learning");
});
