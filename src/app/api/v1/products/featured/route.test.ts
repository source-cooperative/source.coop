/** @jest-environment node */
import { NextRequest } from "next/server";
import { getApiSession } from "@/lib/api/utils";
import { listProducts } from "@/lib/operations/products";

jest.mock("@/lib/api/utils", () => ({ getApiSession: jest.fn() }));
jest.mock("@/lib/operations/products", () => ({ listProducts: jest.fn() }));

const { GET } = require("./route");

const call = () =>
  GET(new NextRequest("http://localhost/api/v1/products/featured"), {
    params: Promise.resolve({}),
  });

// Outside clients read `{ products }`, so the shape outlives the paged listing.
test("answers up to ten featured products as { products }", async () => {
  (getApiSession as jest.Mock).mockResolvedValue(null);
  (listProducts as jest.Mock).mockResolvedValue({
    ok: true,
    value: { items: [{ product_id: "p" }], next_cursor: "more" },
  });
  const res = await call();
  expect(listProducts).toHaveBeenCalledWith(null, { featured: "true", limit: "10" });
  expect(res.status).toBe(200);
  await expect(res.json()).resolves.toEqual({ products: [{ product_id: "p" }] });
});
