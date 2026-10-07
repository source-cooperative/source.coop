import { logoutReturnTo } from "./urls";

describe("logoutReturnTo", () => {
  const origin = "https://source.coop";

  it("keeps a same-site path and query", () => {
    expect(logoutReturnTo("/admin/user-lookup?q=a.b", origin)).toBe(
      "https://source.coop/admin/user-lookup?q=a.b",
    );
  });

  it.each([null, "", "https://evil.example/", "//evil.example", "/\\evil.example"])(
    "falls back to the origin for %p",
    (path) => {
      expect(logoutReturnTo(path, origin)).toMatch(/^https:\/\/source\.coop\/?$/);
    },
  );
});
