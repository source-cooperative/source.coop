import { resultForRow } from "./ProductMirrorsManager";

const ok = (message: string) => ({ message, success: true });
const none = { message: "", success: false };

describe("resultForRow", () => {
  it("shows nothing on a row that was not acted on", () => {
    expect(
      resultForRow({ key: "a", action: "remove" }, "b", {
        remove: ok("Removed X"),
        primary: none,
        prefix: none,
      })
    ).toBeNull();
  });

  it("shows the result of the action that ran on this row", () => {
    expect(
      resultForRow({ key: "a", action: "primary" }, "a", {
        remove: none,
        primary: ok("Primary mirror updated"),
        prefix: none,
      })
    ).toEqual(ok("Primary mirror updated"));
  });

  it("is not fooled by a stale message from an earlier, different action", () => {
    // Each action owns a useActionState, and those never reset — a state keeps
    // its last message until that same action runs again. Remove a mirror, then
    // save a prefix on another row: picking "whichever state still has a
    // message" would surface the remove result on the row that saved a prefix.
    expect(
      resultForRow({ key: "b", action: "prefix" }, "b", {
        remove: ok("Removed X"),
        primary: none,
        prefix: ok("Prefix updated"),
      })
    ).toEqual(ok("Prefix updated"));
  });

  it("stays silent when the acted-on action has produced nothing yet", () => {
    expect(
      resultForRow({ key: "b", action: "prefix" }, "b", {
        remove: ok("Removed X"),
        primary: none,
        prefix: none,
      })
    ).toBeNull();
  });

  it("shows nothing before anything has been acted on", () => {
    expect(
      resultForRow(null, "a", { remove: none, primary: none, prefix: none })
    ).toBeNull();
  });
});
