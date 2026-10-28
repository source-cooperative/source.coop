import { render, screen } from "@testing-library/react";
import { Theme } from "@radix-ui/themes";
import type { PublicAccount } from "@/types";
import { AccountMention } from "./AccountMention";

const accounts = {
  alukach: { account_id: "alukach", name: "Anthony Lukach", type: "individual" },
} as unknown as Record<string, PublicAccount>;

test("links an account the page looked up, for its card on hover", () => {
  render(
    <Theme>
      <AccountMention id="alukach" accounts={accounts} />
    </Theme>
  );
  expect(screen.getByRole("link", { name: "alukach" }).getAttribute("href")).toBe(
    "/alukach"
  );
});

test("shows an id it couldn't look up as plain text", () => {
  render(
    <Theme>
      <AccountMention id="gone" accounts={accounts} />
    </Theme>
  );
  expect(screen.getByText("gone")).toBeTruthy();
  expect(screen.queryByRole("link")).toBeNull();
});
