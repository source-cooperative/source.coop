/**
 * Serializes data as a JSON string safe for embedding inside an inline
 * `<script type="application/ld+json">` tag. Escapes HTML-significant
 * characters (`<`, `>`, `&`) so the payload cannot prematurely close the
 * script tag or be parsed as HTML, and escapes U+2028/U+2029 line
 * separators which are valid in JSON but break JavaScript string literals.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}
