/**
 * A tag's one spelling: lowercase, words joined by single hyphens, with no
 * `#` and no hyphen at either end. So `New Zealand`, `new zealand`,
 * `#new-zealand` and `new - zealand` are all `new-zealand`. Tags are stored
 * and shown this way, and anything a person types goes through it before it
 * is compared with the list.
 */
export const canonTag = (tag: string) =>
  tag
    .toLowerCase()
    .replace(/#/g, "")
    .replace(/[\s-]+/g, "-")
    .replace(/^-+|-+$/g, "");
