/** @jest-environment node */
import { NextRequest } from "next/server";
import { getApiSession } from "@/lib/api/utils";
import { suggestTag } from "@/lib/operations/tags";

jest.mock("@/lib/api/utils", () => ({ getApiSession: jest.fn() }));
jest.mock("@/lib/operations/tags", () => ({
  ...jest.requireActual("@/lib/operations/tags"),
  suggestTag: jest.fn(),
}));

const { POST } = require("./route");

const suggest = () =>
  POST(
    new NextRequest("http://localhost/api/v1/tags", {
      method: "POST",
      headers: { Authorization: "Bearer x" },
      body: JSON.stringify({ tag_id: "sea-ice" }),
    }),
    { params: Promise.resolve({}) }
  );

test.each([
  [true, 201],
  [false, 200],
])("a suggestion with created=%p answers %p and the tag", async (created, status) => {
  (getApiSession as jest.Mock).mockResolvedValue({ account: { account_id: "alice" } });
  (suggestTag as jest.Mock).mockResolvedValue({
    ok: true,
    value: { tag: { tag_id: "sea-ice" }, created },
  });
  const res = await suggest();
  expect(res.status).toBe(status);
  await expect(res.json()).resolves.toEqual({ tag_id: "sea-ice" });
});
