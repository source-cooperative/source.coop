import {
  ACTIVITY_FLOOR,
  ACTIVITY_HALF_LIFE_MS,
  activityRate,
  addActivity,
  decayActivity,
  dotOpacity,
  dotScale,
} from "./activity";

describe("decayActivity", () => {
  it("halves every half-life and never goes negative", () => {
    expect(decayActivity(8, ACTIVITY_HALF_LIFE_MS)).toBeCloseTo(4);
    expect(decayActivity(8, 3 * ACTIVITY_HALF_LIFE_MS)).toBeCloseTo(1);
    expect(decayActivity(8, 1e9)).toBeGreaterThanOrEqual(0);
  });

  it("leaves activity alone when no time, or negative time, has passed", () => {
    expect(decayActivity(5, 0)).toBe(5);
    expect(decayActivity(5, -100)).toBe(5);
    expect(decayActivity(5, NaN)).toBe(5);
  });
});

describe("addActivity", () => {
  it("decays what was there, then adds the tick", () => {
    expect(addActivity(8, ACTIVITY_HALF_LIFE_MS, 3)).toBeCloseTo(7);
  });

  it("counts a replay's requests as older, by the age it is given", () => {
    const live = addActivity(0, 0, 10);
    const replay = addActivity(0, 0, 10, ACTIVITY_HALF_LIFE_MS / 2);
    expect(live).toBe(10);
    expect(replay).toBeCloseTo(10 * Math.SQRT1_2);
  });
});

describe("a steady stream of ticks", () => {
  // 20 requests per second, reported as 10 per 500 ms tick.
  const settle = (perTick: number, ticks: number) => {
    let activity = 0;
    for (let i = 0; i < ticks; i++)
      activity = addActivity(activity, 500, perTick);
    return activity;
  };

  it("settles near the request rate, however long it runs", () => {
    // Read just after a tick lands, which is the peak of the count's sawtooth,
    // so it sits a few percent above the true rate of 20 and never drifts.
    for (const ticks of [80, 200]) {
      const rate = activityRate(settle(10, ticks));
      expect(rate).toBeGreaterThan(20);
      expect(rate).toBeLessThan(22);
    }
  });

  it("varies far less between ticks than the ticks themselves do", () => {
    // Ticks alternating 2 and 18 requests: the raw count swings 9x.
    let activity = 0;
    const seen: number[] = [];
    for (let i = 0; i < 120; i++) {
      activity = addActivity(activity, 500, i % 2 ? 18 : 2);
      if (i >= 60) seen.push(activity);
    }
    expect(Math.max(...seen) / Math.min(...seen)).toBeLessThan(1.4);
  });
});

describe("dotOpacity", () => {
  it("is full for anything busier than a single request and tracks a fade", () => {
    expect(dotOpacity(500)).toBe(1);
    expect(dotOpacity(1)).toBe(1);
    expect(dotOpacity(0.5)).toBe(0.5);
    expect(dotOpacity(-1)).toBe(0);
  });

  it("fades a lone request to the floor in about a dozen seconds", () => {
    expect(decayActivity(1, 10_000)).toBeGreaterThan(ACTIVITY_FLOOR);
    expect(decayActivity(1, 14_000)).toBeLessThan(ACTIVITY_FLOOR);
  });
});

describe("dotScale", () => {
  it("is 1 with no activity and grows with the rate", () => {
    expect(dotScale(0, 3)).toBe(1);
    expect(dotScale(1, 3)).toBeLessThan(dotScale(10, 3));
    expect(dotScale(10, 3)).toBeLessThan(dotScale(1_000, 3));
  });

  it("never exceeds the maximum", () => {
    expect(dotScale(1e12, 3)).toBe(3);
  });
});
