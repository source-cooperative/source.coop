import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Theme } from "@radix-ui/themes";
import {
  GithubWorkflowFields,
  NEW_GITHUB_WORKFLOW,
  githubCondition,
  githubSubject,
  type GithubWorkflow,
} from "./GithubWorkflowFields";

const renderFor = (workflow: Partial<GithubWorkflow>, onChange = jest.fn()) => {
  render(
    <Theme>
      <GithubWorkflowFields
        id="wf"
        workflow={{ ...NEW_GITHUB_WORKFLOW, ...workflow }}
        onChange={onChange}
      />
    </Theme>,
  );
  return onChange;
};

const respond = (status: number, body: unknown = {}) =>
  jest
    .spyOn(global, "fetch")
    .mockResolvedValue({
      ok: status === 200,
      json: async () => body,
    } as Response);

afterEach(() => jest.restoreAllMocks());

describe("githubSubject", () => {
  const repo = { repository: "octocat/repo" };
  it.each([
    [
      { kind: "branch", value: "main" },
      "repo:octocat/repo:ref:refs/heads/main",
    ],
    [{ kind: "tag", value: "v1.0" }, "repo:octocat/repo:ref:refs/tags/v1.0"],
    [
      { kind: "branch", value: "refs/pull/1/merge" },
      "repo:octocat/repo:ref:refs/pull/1/merge",
    ],
    [
      { kind: "environment", value: "prod" },
      "repo:octocat/repo:environment:prod",
    ],
  ] as const)("builds %o", (w, subject) => {
    expect(githubSubject({ ...repo, ...w })).toBe(subject);
  });

  it("names the repository as its tokens do", () => {
    expect(
      githubSubject({
        ...NEW_GITHUB_WORKFLOW,
        ...repo,
        tokenRepository: "octocat@1/repo@2",
      }),
    ).toBe("repo:octocat@1/repo@2:ref:refs/heads/main");
  });
});

describe("githubCondition", () => {
  it("spells the trust out as a StringEquals on GitHub's sub claim", () => {
    expect(
      JSON.parse(
        githubCondition({
          repository: "octocat/repo",
          kind: "environment",
          value: "prod",
        }),
      ),
    ).toEqual({
      StringEquals: {
        "token.actions.githubusercontent.com:sub":
          "repo:octocat/repo:environment:prod",
      },
    });
  });

  it("requires the proxy's audience when it's known", () => {
    const condition = JSON.parse(
      githubCondition(
        { repository: "octocat/repo", kind: "branch", value: "main" },
        "https://data.source.coop",
      ),
    );
    expect(
      condition.StringEquals["token.actions.githubusercontent.com:aud"],
    ).toBe("https://data.source.coop");
  });
});

describe("GithubWorkflowFields", () => {
  it("looks up how a public repository's tokens name it, leaving the typed name alone", async () => {
    respond(200, {
      use_default: true,
      use_immutable_subject: true,
      sub_claim_prefix: "repo:octocat@583231/Hello-World@1296269",
    });
    const onChange = renderFor({ repository: "octocat/hello-world" });

    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          repository: "octocat/hello-world",
          tokenRepository: "octocat@583231/Hello-World@1296269",
        }),
      ),
    );
    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.github.com/repos/octocat/hello-world/actions/oidc/customization/sub",
      expect.anything(),
    );
    expect(screen.getByRole("status").textContent).toBe(
      "Confirmed via GitHub, subject claim prefix is repo:octocat@583231/Hello-World@1296269",
    );
  });

  it("takes a pasted subject prefix without its repo:", () => {
    const onChange = renderFor({});

    fireEvent.change(screen.getByLabelText(/Repository/), {
      target: { value: "repo:octocat@583231/Hello-World@1296269 " },
    });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        repository: "octocat@583231/Hello-World@1296269",
      }),
    );
  });

  it("warns when the repository customizes its subject, and says where to undo it", async () => {
    respond(200, {
      use_default: false,
      include_claim_keys: ["repository_owner_id", "repository_id", "context"],
      sub_claim_prefix: "repo:cli/cli",
    });
    renderFor({ repository: "cli/cli" });

    expect(
      await screen.findByText(/customizes its subject claim/),
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "OIDC settings" }).getAttribute("href"),
    ).toBe("https://github.com/cli/cli/settings/actions/oidc-configuration");
  });

  it("confirms a custom template that builds the default's shape", async () => {
    respond(200, {
      use_default: false,
      include_claim_keys: ["repo", "context"],
      sub_claim_prefix: "repo:octocat/repo",
    });
    renderFor({ repository: "octocat/repo" });

    expect((await screen.findByRole("status")).textContent).toMatch(
      /^Confirmed via GitHub/,
    );
    expect(screen.queryByText(/customizes its subject claim/)).toBeNull();
  });

  it("points a repository GitHub doesn't show at its OIDC settings, and gives the gh command", async () => {
    respond(404);
    renderFor({ repository: "octocat/secret" });

    expect(
      (await screen.findByRole("link", { name: "OIDC settings" })).getAttribute(
        "href",
      ),
    ).toBe(
      "https://github.com/octocat/secret/settings/actions/oidc-configuration",
    );
    expect(
      await screen.findByText(
        "gh api repos/octocat/secret/actions/oidc/customization/sub --jq .sub_claim_prefix",
      ),
    ).toBeTruthy();
  });

  it("tells a rate limit apart from a repository it can't see, and tries again", async () => {
    const fetch = respond(403);
    renderFor({ repository: "octocat/hello-world" });

    expect(await screen.findByText(/couldn.t check/)).toBeTruthy();
    expect(screen.queryByText(/private or doesn.t exist/)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
  });

  it("doesn't look up a repository already named the immutable way", async () => {
    const fetch = respond(200);
    renderFor({ repository: "octocat@583231/Hello-World@1296269" });

    await new Promise((r) => setTimeout(r, 500));
    expect(fetch).not.toHaveBeenCalled();
  });
});
