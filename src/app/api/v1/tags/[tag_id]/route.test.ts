/** @jest-environment node */
import { NextRequest } from "next/server";
import { getApiSession } from "@/lib/api/utils";
import { deleteTag } from "@/lib/operations/tags";

jest.mock("@/lib/api/utils", () => ({ getApiSession: jest.fn() }));
jest.mock("@/lib/operations/tags", () => ({
  ...jest.requireActual("@/lib/operations/tags"),
  deleteTag: jest.fn(),
}));

const { DELETE } = require("./route");

test("passes every replace_with on, so a tag can merge into several, and approved", async () => {
  (getApiSession as jest.Mock).mockResolvedValue({ account: { account_id: "root" } });
  (deleteTag as jest.Mock).mockResolvedValue({ ok: true, value: { tag_id: "field-boundaries" } });

  const res = await DELETE(
    new NextRequest(
      "http://localhost/api/v1/tags/field-boundaries?replace_with=field&replace_with=boundaries&approved=true",
      { method: "DELETE", headers: { Authorization: "Bearer x" } }
    ),
    { params: Promise.resolve({ tag_id: "field-boundaries" }) }
  );

  expect(res.status).toBe(200);
  expect(deleteTag).toHaveBeenCalledWith(expect.anything(), "field-boundaries", {
    replace_with: ["field", "boundaries"],
    approved: "true",
  });
});
