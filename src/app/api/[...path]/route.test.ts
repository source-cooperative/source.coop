/** @jest-environment node */
import { NextRequest } from "next/server";
import { GET, POST } from "./route";

describe("/api/[...path]", () => {
  test.each([GET, POST])("returns a not_found problem", async (handler) => {
    const res = handler(new NextRequest("http://localhost/api/v1/nope"));
    expect(res.status).toBe(404);
    expect(res.headers.get("content-type")).toBe("application/problem+json");
    await expect(res.json()).resolves.toEqual({
      type: "https://source.coop/api/problems/not_found",
      title: "Not found",
      status: 404,
      detail: "No API route at /api/v1/nope",
      code: "not_found",
      instance: "/api/v1/nope",
    });
  });
});
