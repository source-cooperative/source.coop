/** @jest-environment node */
import { getPageSession } from "@/lib";
import * as ops from "@/lib/operations/tags";
import { invalid, ok } from "@/lib/operations/result";
import { reviewTag, suggestTag } from "./tags";

jest.mock("@/lib", () => ({ getPageSession: jest.fn() }));
jest.mock("@/lib/clients/database", () => ({}));
jest.mock("@/lib/operations/tags");

const operations = ops as jest.Mocked<typeof ops>;
const session = { identity_id: "user-1" };

beforeEach(() => {
  jest.resetAllMocks();
  (getPageSession as jest.Mock).mockResolvedValue(session);
});

test("suggestTag answers the stored tag, or why it was refused", async () => {
  operations.suggestTag.mockResolvedValueOnce(ok({ tag: "sea-ice" }));
  expect(await suggestTag("Sea Ice")).toEqual({ tag: "sea-ice" });
  expect(operations.suggestTag).toHaveBeenCalledWith(session, "Sea Ice");

  operations.suggestTag.mockResolvedValueOnce(invalid("Too many", "tag"));
  expect(await suggestTag("x")).toEqual({ error: "Too many" });
});

test("reviewTag passes the form on, and fails loudly on a refusal", async () => {
  operations.reviewTag.mockResolvedValueOnce(ok(null));
  const data = new FormData();
  data.set("tag", "sst");
  data.set("decision", "reject");
  await reviewTag(data);
  expect(operations.reviewTag).toHaveBeenCalledWith(session, {
    tag: "sst",
    decision: "reject",
  });

  operations.reviewTag.mockResolvedValueOnce(invalid("Nope"));
  await expect(reviewTag(data)).rejects.toThrow("Nope");
});
