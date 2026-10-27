/**
 * A tag's one spelling: trimmed, lowercase, with a hyphen wherever it had
 * spaces, so `New Zealand` and `new zealand` are both `new-zealand`. Tags are
 * stored and shown this way, and anything a person types goes through it
 * before it is compared with the list.
 */
export const canonTag = (tag: string) =>
  tag.trim().toLowerCase().replace(/\s+/g, "-");
