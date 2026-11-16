/** @jest-environment node */

jest.mock("@/lib", () => ({
  getPageSession: jest.fn(),
  productsTable: { fetchById: jest.fn() },
}));

jest.mock("@/lib/api/authz", () => ({
  isAuthorized: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  notFound: jest.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

import { getAuthorizedProduct } from "./data";
import { getPageSession, productsTable } from "@/lib";
import { isAuthorized } from "@/lib/api/authz";
import { Actions } from "@/types/shared";

describe("getAuthorizedProduct", () => {
  afterEach(() => jest.clearAllMocks());

  it("returns the product when the viewer is authorized", async () => {
    const product = { product_id: "p", account_id: "a", visibility: "restricted" };
    (productsTable.fetchById as jest.Mock).mockResolvedValue(product);
    (getPageSession as jest.Mock).mockResolvedValue({ identity_id: "u" });
    (isAuthorized as jest.Mock).mockReturnValue(true);

    await expect(getAuthorizedProduct("a", "p")).resolves.toBe(product);
  });

  it("calls notFound when the product does not exist", async () => {
    (productsTable.fetchById as jest.Mock).mockResolvedValue(null);
    (getPageSession as jest.Mock).mockResolvedValue(null);
    (isAuthorized as jest.Mock).mockReturnValue(true);

    await expect(getAuthorizedProduct("a", "missing")).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
  });

  it("calls notFound when an anonymous viewer requests a restricted product", async () => {
    (productsTable.fetchById as jest.Mock).mockResolvedValue({
      product_id: "p",
      account_id: "a",
      visibility: "restricted",
    });
    (getPageSession as jest.Mock).mockResolvedValue(null);
    (isAuthorized as jest.Mock).mockReturnValue(false);

    await expect(getAuthorizedProduct("a", "p")).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
  });

  it("authorizes against the session and product with GetRepository", async () => {
    const product = { product_id: "p", account_id: "a", visibility: "public" };
    const session = { identity_id: "u" };
    (productsTable.fetchById as jest.Mock).mockResolvedValue(product);
    (getPageSession as jest.Mock).mockResolvedValue(session);
    (isAuthorized as jest.Mock).mockReturnValue(true);

    await getAuthorizedProduct("a", "p");

    expect(isAuthorized).toHaveBeenCalledWith(
      session,
      product,
      Actions.GetRepository,
    );
  });
});
