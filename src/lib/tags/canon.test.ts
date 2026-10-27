import { canonTag } from "./canon";

test.each([
  ["New Zealand", "new-zealand"],
  ["  machine   learning ", "machine-learning"],
  ["cloud-native", "cloud-native"],
  ["COG", "cog"],
])("%p is spelled %p", (typed, stored) => {
  expect(canonTag(typed)).toBe(stored);
});
