import { fn } from "storybook/test";
import type * as Real from "../products";
import type { FormState } from "@/components/core/DynamicForm";

/**
 * Storybook stand-in for the product server actions. See
 * `__mocks__/data-connections.ts` for why these exist and how the redirect
 * works.
 *
 * The read action returns empty rather than fixtures: nothing storied so
 * far calls them, and inventing a product list here would be a second source of
 * truth for what a product looks like. A story that needs products should pass
 * them as props.
 */
const idle = (): FormState<Record<string, unknown>> => ({
  fieldErrors: {},
  data: new FormData(),
  message: "",
  success: false,
});

export const createProduct: typeof Real.createProduct = fn(async () =>
  idle()
).mockName("createProduct");

export const updateProduct: typeof Real.updateProduct = fn(async () =>
  idle()
).mockName("updateProduct");

export const deleteProduct: typeof Real.deleteProduct = fn(async () =>
  idle()
).mockName("deleteProduct");

export const getFeaturedProducts: typeof Real.getFeaturedProducts = fn(
  async () => []
).mockName("getFeaturedProducts");

