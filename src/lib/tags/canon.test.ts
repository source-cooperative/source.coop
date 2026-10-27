import { canonTag } from "./canon";

test.each([
  ["New Zealand", "new-zealand"],
  ["  machine   learning ", "machine-learning"],
  ["cloud-native", "cloud-native"],
  ["COG", "cog"],
  ["sea - ice", "sea-ice"],
  ["cloud -native", "cloud-native"],
  ["#ocean", "ocean"],
  ["-edge-", "edge"],
  ["--", ""],
])("%p is spelled %p", (typed, stored) => {
  expect(canonTag(typed)).toBe(stored);
});
