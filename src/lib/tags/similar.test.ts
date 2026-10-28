import { similarTags, singular, singularTag, splitTag } from "./similar";

const approved = [
  "boundaries",
  "boxes",
  "crop-type",
  "crops",
  "field-boundaries",
  "land-use",
  "ocean",
  "sentinel-2",
  "weather",
];
const names = (tag: string) => similarTags(tag, approved).map((m) => m.tag);

test.each([
  ["landuse", "land-use"],
  ["sentinel2-l2a", "sentinel-2"],
  ["crop-types", "crop-type"],
  ["field-boundary-polygons", "field-boundaries"],
  ["boundary", "boundaries"],
  ["box", "boxes"],
])("%p looks most like %p", (tag, best) => {
  expect(names(tag)[0]).toBe(best);
});

test("a tag unlike any other has no matches", () => {
  expect(names("sea-ice")).toEqual([]);
});

test("offers at most three, best first", () => {
  const matches = similarTags("crop", ["crops", "crop-type", "crop yield", "crop map"]);
  expect(matches).toHaveLength(3);
  expect(matches[0].score).toBeGreaterThanOrEqual(matches[2].score);
});

test("splits a suggestion whose every word is an approved tag", () => {
  const list = ["field", "boundaries", "crops", "field-boundaries"];
  expect(splitTag("field-boundaries", list)).toEqual(["field", "boundaries"]);
  expect(splitTag("field-boundary", list)).toEqual(["field", "boundaries"]);
  expect(splitTag("field-polygons", list)).toBeNull();
  expect(splitTag("crops", list)).toBeNull();
});

test("singular takes a plural word to the singular and leaves the rest", () => {
  expect(["boundaries", "boxes", "crops", "areas"].map(singular)).toEqual([
    "boundary",
    "box",
    "crop",
    "area",
  ]);
  for (const word of ["class", "analysis", "status", "series", "gas"]) {
    expect(singular(word)).toBe(word);
  }
  expect(singularTag("building-footprints")).toBe("building-footprint");
  expect(singularTag("time-series")).toBe("time-series");
});
