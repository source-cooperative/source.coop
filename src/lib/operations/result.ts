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

/** `?cursor=` and `?limit=`, as every paged list takes them. */
export const PageQuerySchema = z.object({
  cursor: z
    .string()
    .optional()
    .openapi({ description: "The `next_cursor` of the previous page." }),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * A cursor is DynamoDB's LastEvaluatedKey, base64url'd so it survives a query
 * string unescaped. `schema` names the key a list may resume from; anything
 * else decodes to null, for the list to refuse rather than DynamoDB.
 */
export function decodeCursor(cursor: string, schema: z.ZodTypeAny) {
  try {
    const key = schema.safeParse(JSON.parse(Buffer.from(cursor, "base64url").toString()));
    return key.success ? (key.data as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export const encodeCursor = (key: unknown) =>
  key ? Buffer.from(JSON.stringify(key)).toString("base64url") : null;

const fail =
  (error: OperationError) =>
  (message: string, fieldErrors?: Record<string, string[]>) =>
    ({ ok: false, error, message, fieldErrors }) as const;

export const unauthenticated = () =>
  fail("unauthenticated")("Authentication required");
export const forbidden = fail("forbidden");
/** Refused: 401 to a caller who could sign in and try again, 403 otherwise. */
export const deny = (session: unknown, message: string) =>
  session ? forbidden(message) : unauthenticated();
export const notFound = fail("not_found");
export const conflict = fail("conflict");
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
