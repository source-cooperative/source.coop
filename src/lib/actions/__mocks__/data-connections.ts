import { fn } from "storybook/test";
import type * as Real from "../data-connections";
import type { FormState } from "@/components/core/DynamicForm";

/**
 * Storybook stand-in for the data-connection server actions.
 *
 * Storybook redirects `@/lib/actions/data-connections` here when
 * `.storybook/preview.tsx` calls `sb.mock()` on it -- a `__mocks__` sibling is
 * found automatically, the same convention jest uses. Nothing in `src/` imports
 * this file, and the app build never sees it.
 *
 * The real module is `"use server"`, so importing it into a browser bundle
 * drags the AWS SDK in and the form dies on `__filename is not defined` before
 * it renders a single field. This is the whole reason DataConnectionForm had no
 * story.
 *
 * Each export is annotated `typeof Real.x`. That import is type-only, so it is
 * erased and never reaches the browser -- but it means a signature change on
 * the real action breaks `tsc` here instead of leaving a story quietly
 * rendering something that can no longer happen.
 */
const idle = (): FormState<Record<string, unknown>> => ({
  fieldErrors: {},
  data: new FormData(),
  message: "",
  success: false,
});

export const createDataConnection: typeof Real.createDataConnection = fn(
  async () => idle()
).mockName("createDataConnection");

export const updateDataConnection: typeof Real.updateDataConnection = fn(
  async () => idle()
).mockName("updateDataConnection");

export const deleteDataConnection: typeof Real.deleteDataConnection = fn(
  async () => idle()
).mockName("deleteDataConnection");
