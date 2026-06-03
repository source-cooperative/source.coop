/**
 * Rejects with an `Error(message)` if `promise` does not settle within `ms`.
 *
 * The timer is cleared as soon as the race settles (success or failure), so it
 * never holds the event loop open — important on the server, where a dangling
 * timer would keep a serverless invocation alive past its work.
 */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message = "Operation timed out",
): Promise<T> {
  // `| undefined` reflects that the timer isn't assigned until the Promise
  // executor runs; clearTimeout(undefined) is a no-op, so the `.finally`
  // cleanup stays correct.
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
