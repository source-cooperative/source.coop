/** @jest-environment node */
import { NextRequest } from "next/server";
import { GET, POST } from "./route";

describe("/api/[...path]", () => {
  test.each([GET, POST])("returns a JSON 404", async (handler) => {
    const res = handler(new NextRequest("http://localhost/api/v1/nope"));
    expect(res.status).toBe(404);
    expect(res.headers.get("content-type")).toContain("application/json");
    await expect(res.json()).resolves.toEqual({
      error: "No API route at /api/v1/nope",
    });
  });
});
