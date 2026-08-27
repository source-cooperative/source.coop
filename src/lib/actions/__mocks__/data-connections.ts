import { fn } from "storybook/test";
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
 * Actions are `fn()` rather than plain functions so a story can assert on the
 * submitted FormData, or drive a failure with `.mockResolvedValue()`.
 */
const idle = (): FormState<Record<string, unknown>> => ({
  fieldErrors: {},
  data: new FormData(),
  message: "",
  success: false,
});

export const createDataConnection = fn(async () => idle()).mockName(
  "createDataConnection"
);

export const updateDataConnection = fn(async () => idle()).mockName(
  "updateDataConnection"
);
