export type Language = "yaml" | "shell";
export type TokenKind = "comment" | "key" | "keyword" | "punctuation" | "value" | "plain";
export interface Token {
  text: string;
  kind: TokenKind;
}

// ponytail: line patterns for the two snippet shapes we generate — a YAML
// workflow step and shell `export`s — not a general highlighter. Reach for
// shiki if arbitrary code ever needs colouring.
const PATTERNS: Record<Language, [RegExp, TokenKind[]][]> = {
  yaml: [
    [/^(\s*)(#.*)$/, ["plain", "comment"]],
    [/^(\s*-?\s*)([\w-]+)(:)(.*)$/, ["plain", "key", "punctuation", "value"]],
  ],
  shell: [
    [/^(\s*#.*)$/, ["comment"]],
    [/^(export)(\s+)(\w+)(=)(.*)$/, ["keyword", "plain", "key", "punctuation", "value"]],
  ],
};

/** One line of a snippet as coloured runs; an unrecognised line is plain. */
export function highlightLine(line: string, language: Language): Token[] {
  for (const [pattern, kinds] of PATTERNS[language]) {
    const match = line.match(pattern);
    if (match) {
      return kinds
        .map((kind, i) => ({ text: match[i + 1], kind }))
        .filter((token) => token.text !== "");
    }
  }
  return [{ text: line, kind: "plain" }];
}
