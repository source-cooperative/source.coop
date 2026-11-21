/**
 * How busy a datacenter looks on the live globe, as a decayed count of
 * requests.
 *
 * Each tick adds the requests it reports, and the total halves every
 * `ACTIVITY_HALF_LIFE_MS`. A dot therefore swells while its datacenter is busy
 * and ebbs when it goes quiet, instead of jumping to whatever the latest tick
 * happened to carry. For a steady rate of r requests per second the count
 * settles near r * H / ln 2, which `activityRate` turns back into a rate.
 *
 * Kept free of React and three so it can be tested on its own.
 */

/** Time for a datacenter's activity to halve with no new requests. */
export const ACTIVITY_HALF_LIFE_MS = 3_000;

/** Below this a dot is invisible (see `dotOpacity`), so it is dropped. */
export const ACTIVITY_FLOOR = 0.05;

/** `activity` after `elapsedMs` with no new requests. */
export function decayActivity(activity: number, elapsedMs: number): number {
  if (!(elapsedMs > 0)) return activity;
  return activity * 2 ** (-elapsedMs / ACTIVITY_HALF_LIFE_MS);
}

/**
 * Fold a tick into a datacenter's activity: decay what was there for
 * `elapsedMs` since it was last updated, then add the tick's `requests`.
 * `requestAgeMs` is how old those requests are on average: 0 for a live tick,
 * half the window for a replay that merges several seconds into one message.
 */
export function addActivity(
  activity: number,
  elapsedMs: number,
  requests: number,
  requestAgeMs = 0,
): number {
  return (
    decayActivity(activity, elapsedMs) + decayActivity(requests, requestAgeMs)
  );
}

/** The steady request rate, per second, that would settle at `activity`. */
export function activityRate(activity: number): number {
  return (activity * Math.LN2) / (ACTIVITY_HALF_LIFE_MS / 1_000);
}

/**
 * A single request lights its dot fully and it then fades with the activity;
 * anything busier than that stays fully lit.
 */
export function dotOpacity(activity: number): number {
  return Math.min(1, Math.max(0, activity));
}

/**
 * Dot size as a multiple of the base size. Logarithmic in the request rate, so
 * a few busy datacenters do not swamp the rest, and capped at `maxScale`.
 */
export function dotScale(activity: number, maxScale: number): number {
  return 1 + Math.min(maxScale - 1, Math.log10(1 + activityRate(activity)) / 2);
}
