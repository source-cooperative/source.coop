/**
 * Sets one top-level property of a catalog entry's JSON text and leaves every
 * other byte alone. The pipeline writes these files with Python's formatting
 * (`\u` escapes, `1.0` floats), so re-serialising the whole entry would
 * rewrite lines the edit never touched.
 */
export function setTopLevel(
  text: string,
  key: "keywords" | "_edited",
  value: unknown
): string {
  const json = JSON.stringify(value, null, 2)
    .replace(/\n/g, "\n  ")
    .replace(/[\u0080-￿]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`);
  const entry = `  "${key}": ${json}`;
  const lines = text.split("\n");
  const first = lines.findIndex((line) => line.startsWith(`  "${key}": `));
  if (first < 0) {
    const end = text.lastIndexOf("\n}");
    if (end < 0) throw new Error("Catalog entry is not a JSON object");
    return `${text.slice(0, end)},\n${entry}${text.slice(end)}`;
  }
  // A value that opens a block runs to the next closing bracket at this indent.
  let last = first;
  if (/[[{]$/.test(lines[first])) {
    while (!/^  [\]}],?$/.test(lines[++last] ?? "  }")) {
      if (last >= lines.length) throw new Error(`Catalog entry's "${key}" is unterminated`);
    }
  }
  const comma = lines[last].endsWith(",") ? "," : "";
  lines.splice(first, last - first + 1, entry + comma);
  return lines.join("\n");
}
