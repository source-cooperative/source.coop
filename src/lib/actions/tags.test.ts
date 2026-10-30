/** @jest-environment node */
import { getPageSession } from "@/lib";
import * as ops from "@/lib/operations/tags";
import { conflict, ok } from "@/lib/operations/result";
import { reviewTag } from "./tags";

jest.mock("@/lib", () => ({ getPageSession: jest.fn() }));
jest.mock("@/lib/clients/database", () => ({}));
jest.mock("@/lib/operations/tags");

const operations = ops as jest.Mocked<typeof ops>;
const session = { account: { account_id: "alice" } };

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) data.set(k, v);
  return data;
};

beforeEach(() => {
  jest.resetAllMocks();
  (getPageSession as jest.Mock).mockResolvedValue(session);
});

describe("reviewTag", () => {
  test("approve, merge and reject map to the operations", async () => {
    operations.updateTag.mockResolvedValue(ok({ tag_id: "sst" }));
    operations.deleteTag.mockResolvedValue(ok({ tag_id: "sst" }));

    await reviewTag(form({ tag: "sst", decision: "approve", category: "domain" }));
    await reviewTag(form({ tag: "sst", decision: "merge", into: "ocean" }));
    await reviewTag(form({ tag: "sst", decision: "reject" }));
    await reviewTag(form({ tag: "sst", decision: "undo" }));

    expect(operations.updateTag).toHaveBeenCalledWith(session, "sst", {
      pending: false,
      category: "domain",
    });
    expect(operations.deleteTag).toHaveBeenNthCalledWith(1, session, "sst", {
      replace_with: ["ocean"],
    });
    expect(operations.deleteTag).toHaveBeenNthCalledWith(2, session, "sst", {});
    expect(operations.updateTag).toHaveBeenLastCalledWith(session, "sst", {
      pending: true,
    });
  });

  test("answers the refusal, so the page shows it", async () => {
    operations.deleteTag.mockResolvedValue(conflict('"sst" is not awaiting review'));
    expect(await reviewTag(form({ tag: "sst", decision: "reject" }))).toEqual({
      error: '"sst" is not awaiting review',
    });
    operations.updateTag.mockResolvedValue(ok({ tag_id: "sst" }));
    expect(await reviewTag(form({ tag: "sst", decision: "approve" }))).toEqual({});
  });
});
