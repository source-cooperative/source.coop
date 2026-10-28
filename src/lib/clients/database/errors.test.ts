import { isTransactionRefused } from "./errors";

const cancelled = (...codes: string[]) => ({
  name: "TransactionCanceledException",
  CancellationReasons: codes.map((Code) => ({ Code })),
});

test.each([
  [cancelled("None", "ConditionalCheckFailed"), true],
  [cancelled("TransactionConflict"), true],
  [cancelled("None", "ThrottlingError"), false],
  [cancelled("ConditionalCheckFailed", "ValidationError"), false],
  [{ name: "ConditionalCheckFailedException" }, false],
])("a transaction cancelled as %p is refused: %p", (error, refused) => {
  expect(isTransactionRefused(error)).toBe(refused);
});
