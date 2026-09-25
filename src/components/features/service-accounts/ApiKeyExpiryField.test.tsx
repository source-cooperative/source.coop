import { render } from "@testing-library/react";
import { Theme } from "@radix-ui/themes";
import { ApiKeyExpiryField } from "./ApiKeyExpiryField";

// jsdom has no ResizeObserver, and Radix's Select measures its trigger with one.
global.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

// The field's one job beyond looks: submit `expires_in_days` the way the key
// actions read it. "Never" can't be an empty Select value, so it must reach the
// form as an empty string, which the actions take as no expiry.
const submitted = (ui: React.ReactElement) =>
  (render(<Theme>{ui}</Theme>).container.querySelector(
    'input[name="expires_in_days"]'
  ) as HTMLInputElement).value;

describe("ApiKeyExpiryField", () => {
  it("submits 90 days by default", () => {
    expect(submitted(<ApiKeyExpiryField id="expiry" />)).toBe("90");
  });

  it("submits an empty value for a key that never expires", () => {
    expect(submitted(<ApiKeyExpiryField id="expiry" never />)).toBe("");
  });
});
