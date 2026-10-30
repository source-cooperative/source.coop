/**
 * Whether a DynamoDB write was refused by its ConditionExpression: the row
 * already exists for a create, is gone for an update, or changed under a
 * compare-and-swap. Matched by name rather than `instanceof`, so it holds for
 * any copy of the SDK's error class and for the plain errors tests throw.
 *
 * Its own module, so code under test that mocks the table clients still gets
 * the real check.
 */
export const isConditionalCheckFailed = (error: unknown): boolean =>
  (error as { name?: unknown } | null)?.name ===
  "ConditionalCheckFailedException";

/**
 * Whether a transaction was cancelled because a condition failed or another
 * write touched one of its items at the same moment: retrying after a fresh
 * read can succeed. Throttling and invalid requests are left to throw.
 */
export const isTransactionRefused = (error: unknown): boolean => {
  const { name, CancellationReasons = [] } = (error ?? {}) as {
    name?: unknown;
    CancellationReasons?: { Code?: string }[];
  };
  const codes = CancellationReasons.map((r) => r.Code ?? "None");
  return (
    name === "TransactionCanceledException" &&
    codes.some((c) => c !== "None") &&
    codes.every((c) => ["None", "ConditionalCheckFailed", "TransactionConflict"].includes(c))
  );
};
