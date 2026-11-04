/**
 * Whether a DynamoDB write was refused by its ConditionExpression: the row
 * already exists for a create, is gone for an update, or changed under a
 * compare-and-swap. A transaction cancelled by one of its items' conditions
 * counts too. Matched by name rather than `instanceof`, so it holds for any
 * copy of the SDK's error class and for the plain errors tests throw.
 *
 * Its own module, so code under test that mocks the table clients still gets
 * the real check.
 */
export const isConditionalCheckFailed = (error: unknown): boolean => {
  const { name, CancellationReasons } =
    (error as { name?: unknown; CancellationReasons?: { Code?: string }[] } | null) ?? {};
  return (
    name === "ConditionalCheckFailedException" ||
    (name === "TransactionCanceledException" &&
      !!CancellationReasons?.some((r) => r?.Code === "ConditionalCheckFailed"))
  );
};
