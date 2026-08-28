import { fn } from "storybook/test";
import type * as Real from "../product-mirrors";
import type { FormState } from "@/components/core/DynamicForm";

/**
 * Storybook stand-in for the product-mirror server actions. See
 * `__mocks__/data-connections.ts` for why these exist and how the redirect
 * works.
 *
 * These four are what ProductMirrorsManager submits — adding a mirror, removing
 * one, editing a prefix in place, and promoting one to primary. Every story
 * resolves them idle, so the manager renders its rows without a story needing a
 * product or a database behind it.
 */
const idle = (): FormState<Record<string, unknown>> => ({
  fieldErrors: {},
  data: new FormData(),
  message: "",
  success: false,
});

export const addProductMirror: typeof Real.addProductMirror = fn(async () =>
  idle()
).mockName("addProductMirror");

export const removeProductMirror: typeof Real.removeProductMirror = fn(
  async () => idle()
).mockName("removeProductMirror");

export const updateMirrorPrefix: typeof Real.updateMirrorPrefix = fn(async () =>
  idle()
).mockName("updateMirrorPrefix");

export const setPrimaryMirror: typeof Real.setPrimaryMirror = fn(async () =>
  idle()
).mockName("setPrimaryMirror");
