/** @jest-environment node */
import { NextRequest } from "next/server";
import { getApiSession } from "@/lib/api/utils";

jest.mock("@/lib/api/utils", () => ({
  getApiSession: jest.fn(),
}));

const { GET } = require("./route");

describe("/api/v1/whoami", () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test("returns session when authenticated", async () => {
    const session = { identity_id: "foo" };
    (getApiSession as jest.Mock).mockResolvedValue(session);
    const req = new NextRequest("http://localhost/api/v1/whoami");
    const res = await GET(req);
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual(session);
  });

  test("returns 401 when not authenticated", async () => {
    (getApiSession as jest.Mock).mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/v1/whoami");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });
});
