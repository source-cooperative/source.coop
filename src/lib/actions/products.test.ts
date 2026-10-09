/** @jest-environment node */
import { revalidatePath } from "next/cache";
import { Product } from "@/types";
import { getPageSession } from "@/lib";
import * as ops from "@/lib/operations/products";
import { forbidden, ok } from "@/lib/operations/result";
import { createProduct, deleteProduct, updateProduct } from "./products";

jest.mock("@/lib", () => ({
  getPageSession: jest.fn(),
  LOGGER: { error: jest.fn() },
}));
jest.mock("@/lib/clients/database", () => ({}));
jest.mock("@/lib/operations/products");
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

const operations = ops as jest.Mocked<typeof ops>;
const session = { identity_id: "user-1" };
const product = { account_id: "alice", product_id: "my-product" } as Product;

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) data.set(k, v);
  return data;
};

beforeEach(() => {
  jest.resetAllMocks();
  (getPageSession as jest.Mock).mockResolvedValue(session);
});

test("createProduct passes the form on, and sends the creator to the new product", async () => {
  operations.createProduct.mockResolvedValue(ok(product));
  const data = form({ account_id: "alice", product_id: "My-Product" });

  const state = await createProduct(undefined, data);

  expect(operations.createProduct).toHaveBeenCalledWith(session, {
    account_id: "alice",
    product_id: "My-Product",
  });
  // The operation's product ID, which the schema lowercases.
  expect(state).toMatchObject({ success: true, redirectTo: "/alice/my-product?success" });
});

describe("updateProduct", () => {
  test("leaves empty and absent fields as they are", async () => {
    operations.updateProduct.mockResolvedValue(ok(product));
    const data = form({ account_id: "alice", product_id: "my-product", title: "", visibility: "public" });

    expect(await updateProduct(undefined, data)).toMatchObject({ success: true });

    expect(operations.updateProduct).toHaveBeenCalledWith(session, "alice", "my-product", {
      title: undefined,
      description: undefined,
      visibility: "public",
      disabled: undefined,
    });
    expect(revalidatePath).toHaveBeenCalled();
  });

  test.each([["true", true], ["false", false]])(
    "reads disabled=%s from the activation toggle",
    async (raw, disabled) => {
      operations.updateProduct.mockResolvedValue(ok(product));
      await updateProduct(undefined, form({ disabled: raw }));
      expect(operations.updateProduct.mock.calls[0][3]).toMatchObject({ disabled });
    }
  );

  test("shows the refusal, and revalidates nothing", async () => {
    operations.updateProduct.mockResolvedValue(forbidden("No"));
    expect(await updateProduct(undefined, form({}))).toMatchObject({
      success: false,
      message: "No",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("deleteProduct", () => {
  test("passes whether to keep the data, and revalidates the account", async () => {
    operations.deleteProduct.mockResolvedValue(ok(product));
    expect(await deleteProduct("alice", "my-product", true)).toEqual({ success: true });
    expect(operations.deleteProduct).toHaveBeenCalledWith(session, "alice", "my-product", {
      preserve_data: "true",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/alice");
  });

  test("reports a refusal", async () => {
    operations.deleteProduct.mockResolvedValue(forbidden("No"));
    expect(await deleteProduct("alice", "my-product")).toEqual({ success: false, error: "No" });
  });

  test("surfaces the underlying failure reason instead of a generic message", async () => {
    operations.deleteProduct.mockRejectedValue(new Error("Access Denied"));
    expect(await deleteProduct("alice", "my-product")).toEqual({
      success: false,
      error: "Failed to delete product: Access Denied",
    });
  });
});
