import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z, type ZodError, type ZodTypeAny } from "zod";
import type { FormState } from "@/components/core/DynamicForm";

extendZodWithOpenApi(z);

/**
 * What an operation returns. Operations decide everything about whether a
 * mutation may happen — parsing, business rules, authorization — and say so
 * here, so that each adapter (server action, API route) only reshapes the
 * answer and never re-decides it.
 */
export type OperationError =
  | "invalid"
  | "unauthenticated"
  | "forbidden"
  | "not_found"
  | "conflict";

export type OperationResult<T> =
  | { ok: true; value: T }
  | {
      ok: false;
      error: OperationError;
      message: string;
      fieldErrors?: Record<string, string[]>;
    };

export const ok = <T>(value: T): OperationResult<T> => ({ ok: true, value });

/** What every list answers: a page of items, and where the next one starts. */
export type Page<T> = { items: T[]; next_cursor: string | null };

/** The schema of a `Page` of `item`, registered in the reference as `name`. */
export const pageSchema = <T extends ZodTypeAny>(name: string, item: T) =>
  z
    .object({
      items: z.array(item),
      next_cursor: z
        .string()
        .nullable()
        .openapi({ description: "Pass as `cursor` for the next page; null on the last." }),
    })
    .openapi(name);

/**
 * A list read whole, as its only page. The shape lets a client follow
 * `next_cursor` now, so real pages can come later without breaking it.
 */
export const onePage = <T>(items: T[]): Page<T> => ({ items, next_cursor: null });

const fail =
  (error: OperationError) =>
  (message: string, fieldErrors?: Record<string, string[]>) =>
    ({ ok: false, error, message, fieldErrors }) as const;

export const unauthenticated = () =>
  fail("unauthenticated")("Authentication required");
export const forbidden = fail("forbidden");
export const notFound = fail("not_found");
export const conflict = fail("conflict");
/** Refused: to a caller with no session, for want of one. */
export const deny = (session: unknown, message: string) =>
  session ? forbidden(message) : unauthenticated();
/** A rule about the input failed; name the field when there is one. */
export const invalid = (message: string, field?: string) =>
  fail("invalid")(message, field ? { [field]: [message] } : undefined);

/** Field errors are keyed by dotted path, so a nested field is named in full. */
export function fromZodError(error: ZodError) {
  const fieldErrors: Record<string, string[]> = {};
  for (const { path, message } of error.issues) {
    if (path.length) (fieldErrors[path.join(".")] ??= []).push(message);
  }
  return fail("invalid")(error.issues[0]?.message ?? "Invalid input", fieldErrors);
}

/** The server-action adapter: an operation's result as `DynamicForm` state. */
export function toFormState<T>(
  result: OperationResult<T>,
  data: FormData,
  successMessage: string,
  redirectTo?: string
): FormState<T> {
  return result.ok
    ? { success: true, data, message: successMessage, fieldErrors: {}, redirectTo }
    : {
        success: false,
        data,
        message: result.message,
        fieldErrors: result.fieldErrors ?? {},
      };
}
