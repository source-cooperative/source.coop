import type { ZodError } from "zod";
import type { FormState } from "@/components/core/DynamicForm";

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

const fail =
  (error: OperationError) =>
  (message: string, fieldErrors?: Record<string, string[]>) =>
    ({ ok: false, error, message, fieldErrors }) as const;

export const unauthenticated = () =>
  fail("unauthenticated")("Authentication required");
export const forbidden = fail("forbidden");
export const notFound = fail("not_found");
export const conflict = fail("conflict");
/** A rule about the input failed; name the field when there is one. */
export const invalid = (message: string, field?: string) =>
  fail("invalid")(message, field ? { [field]: [message] } : undefined);

export function fromZodError(error: ZodError) {
  const fieldErrors = Object.fromEntries(
    Object.entries(error.flatten().fieldErrors).filter(
      (entry): entry is [string, string[]] => !!entry[1]?.length
    )
  );
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
