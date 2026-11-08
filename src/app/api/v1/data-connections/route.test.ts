/** @jest-environment node */
import { NextRequest } from "next/server";
import { getApiSession } from "@/lib/api/utils";
import { dataConnectionsTable } from "@/lib/clients/database";

jest.mock("@/lib/api/utils", () => ({ getApiSession: jest.fn() }));
jest.mock("@/lib/clients/database", () => ({
  dataConnectionsTable: { listPage: jest.fn() },
  accountsTable: { fetchById: jest.fn() },
  productsTable: {},
}));

const { GET } = require("./route");

test("answers an anonymous list with a 401 problem", async () => {
  (getApiSession as jest.Mock).mockResolvedValue(null);
  const res = await GET(new NextRequest("http://localhost/api/v1/data-connections"), {
    params: Promise.resolve({}),
  });
  expect(res.status).toBe(401);
  expect(res.headers.get("content-type")).toContain("application/problem+json");
  expect(res.headers.get("www-authenticate")).toBe("Bearer");
  await expect(res.json()).resolves.toMatchObject({ code: "unauthenticated" });
  expect(dataConnectionsTable.listPage).not.toHaveBeenCalled();
});
