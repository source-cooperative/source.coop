import { parseGithubSubject } from "./account-trust";

describe("parseGithubSubject", () => {
  test.each([
    [
      "repo:miskatonic/climate-data:ref:refs/heads/main",
      { repo: "miskatonic/climate-data", pinned: false, kind: "branch", name: "main" },
    ],
    [
      "repo:miskatonic/climate-data:ref:refs/heads/release/2026",
      { repo: "miskatonic/climate-data", pinned: false, kind: "branch", name: "release/2026" },
    ],
    [
      "repo:miskatonic/field-notes:ref:refs/tags/v2.1.0",
      { repo: "miskatonic/field-notes", pinned: false, kind: "tag", name: "v2.1.0" },
    ],
    [
      "repo:miskatonic@8123456/climate-data@9456789:environment:production",
      { repo: "miskatonic/climate-data", pinned: true, kind: "environment", name: "production" },
    ],
    [
      "repo:miskatonic/climate-data:environment:staging eu",
      { repo: "miskatonic/climate-data", pinned: false, kind: "environment", name: "staging eu" },
    ],
    [
      "repo:miskatonic/climate-data:ref:refs/pull/12/merge",
      { repo: "miskatonic/climate-data", pinned: false, kind: "ref", name: "refs/pull/12/merge" },
    ],
  ])("reads %s", (subject, parts) => {
    expect(parseGithubSubject(subject)).toEqual(parts);
  });

  test("is null for a subject of any other shape", () => {
    expect(parseGithubSubject("system:serviceaccount:ci:deployer")).toBeNull();
    expect(parseGithubSubject("repo:miskatonic/climate-data:pull_request")).toBeNull();
  });
});
