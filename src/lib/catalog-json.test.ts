import { setTopLevel } from "./catalog-json";

const entry = (keywords: string) =>
  `{\n  "title": "Caf\\u00e9 \\u2014 [x]",\n  "bbox": [\n    -180.0,\n    1\n  ],\n${keywords}  "license": "MIT"\n}\n`;

describe("setTopLevel", () => {
  it("replaces a block and touches nothing else", () => {
    const before = entry('  "keywords": [\n    "a",\n    "b"\n  ],\n');
    expect(setTopLevel(before, "keywords", ["c"])).toBe(
      entry('  "keywords": [\n    "c"\n  ],\n')
    );
  });

  it("replaces an empty list on one line", () => {
    expect(setTopLevel(entry('  "keywords": [],\n'), "keywords", ["c"])).toBe(
      entry('  "keywords": [\n    "c"\n  ],\n')
    );
  });

  it("appends a property the entry lacks", () => {
    const out = setTopLevel(entry(""), "keywords", ["é"]);
    expect(out).toBe(entry("").replace('"MIT"\n}', '"MIT",\n  "keywords": [\n    "\\u00e9"\n  ]\n}'));
    expect(JSON.parse(out).keywords).toEqual(["é"]);
  });

  it("replaces an object and keeps the last property comma-free", () => {
    const out = setTopLevel('{\n  "a": 1,\n  "_edited": {\n    "by": "x"\n  }\n}\n', "_edited", {
      by: "y",
    });
    expect(out).toBe('{\n  "a": 1,\n  "_edited": {\n    "by": "y"\n  }\n}\n');
  });
});
