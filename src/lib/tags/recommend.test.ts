import { recommendTags } from "./recommend";

const approved = ["agriculture", "boundaries", "field", "remote-sensing", "geoparquet"];

test("matches keywords to approved tags, however they're spelled", () => {
  expect(
    recommendTags(["agriculture", "Remote Sensing", "remotesensing", "GeoParquet"], approved)
  ).toEqual([
    { keyword: "agriculture", tags: ["agriculture"] },
    { keyword: "remote-sensing", tags: ["remote-sensing"] },
    { keyword: "remotesensing", tags: ["remote-sensing"] },
    { keyword: "geoparquet", tags: ["geoparquet"] },
  ]);
});

test("splits a keyword whose words are each approved, in the singular or plural", () => {
  expect(recommendTags(["field-boundaries", "field boundary"], approved)).toEqual([
    { keyword: "field-boundaries", tags: ["field", "boundaries"] },
    { keyword: "field-boundary", tags: ["field", "boundaries"] },
  ]);
});

test("offers anything else as a new tag, once, if it could be stored", () => {
  expect(
    recommendTags(["land-parcels", "Land Parcels", "x".repeat(41), "sentinel_2"], approved)
  ).toEqual([{ keyword: "land-parcels", tags: null }]);
});
