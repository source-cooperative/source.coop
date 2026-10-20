import { highlightLine } from "./highlight";

const kinds = (line: string, language: "yaml" | "shell") =>
  highlightLine(line, language).map((t) => [t.kind, t.text]);

it("colours YAML comments, keys and values, keeping every character", () => {
  expect(kinds("# In the job", "yaml")).toEqual([["comment", "# In the job"]]);
  expect(kinds("  - name: Sign in", "yaml")).toEqual([
    ["plain", "  - "],
    ["key", "name"],
    ["punctuation", ":"],
    ["value", " Sign in"],
  ]);
  expect(kinds("env:", "yaml")).toEqual([
    ["key", "env"],
    ["punctuation", ":"],
  ]);
});

it("colours shell exports, and leaves anything else plain", () => {
  expect(kinds("export AWS_REGION=us-west-2", "shell")).toEqual([
    ["keyword", "export"],
    ["plain", " "],
    ["key", "AWS_REGION"],
    ["punctuation", "="],
    ["value", "us-west-2"],
  ]);
  expect(kinds("echo hi", "shell")).toEqual([["plain", "echo hi"]]);
});
