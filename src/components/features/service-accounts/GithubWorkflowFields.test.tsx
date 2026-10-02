import { render, screen, waitFor } from "@testing-library/react";
import { Theme } from "@radix-ui/themes";
import { GithubWorkflowFields, NEW_GITHUB_WORKFLOW, githubCondition } from "./GithubWorkflowFields";

const renderFor = (repository: string, onChange = jest.fn()) => {
  render(
    <Theme>
      <GithubWorkflowFields
        id="wf"
        workflow={{ ...NEW_GITHUB_WORKFLOW, repository }}
        onChange={onChange}
      />
    </Theme>
  );
  return onChange;
};

const respond = (status: number, body: unknown = {}) =>
  jest
    .spyOn(global, "fetch")
    .mockResolvedValue({ ok: status === 200, json: async () => body } as Response);

afterEach(() => jest.restoreAllMocks());

describe("githubCondition", () => {
  it("spells the trust out as a StringEquals on GitHub's sub claim", () => {
    expect(
      JSON.parse(githubCondition({ repository: "octocat/repo", kind: "environment", value: "prod" }))
    ).toEqual({
      StringEquals: {
        "token.actions.githubusercontent.com:sub": "repo:octocat/repo:environment:prod",
      },
    });
  });
});

describe("GithubWorkflowFields", () => {
  it("fills in a public repository as its tokens name it", async () => {
    respond(200, {
      use_default: true,
      use_immutable_subject: true,
      sub_claim_prefix: "repo:octocat@583231/Hello-World@1296269",
    });
    const onChange = renderFor("octocat/hello-world");

    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ repository: "octocat@583231/Hello-World@1296269" })
      )
    );
    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.github.com/repos/octocat/hello-world/actions/oidc/customization/sub",
      expect.anything()
    );
  });

  it("leaves a repository alone when its tokens name it as typed", async () => {
    respond(200, { use_default: true, sub_claim_prefix: "repo:octocat/Hello-World" });
    const onChange = renderFor("octocat/Hello-World");

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 0));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("warns when the repository customizes its subject", async () => {
    respond(200, { use_default: false, sub_claim_prefix: "repo:cli/cli" });
    renderFor("cli/cli");

    expect(await screen.findByText(/customizes its subject claim/)).toBeTruthy();
  });

  it("gives the gh command for a repository GitHub doesn't show", async () => {
    respond(404);
    renderFor("octocat/secret");

    expect(
      await screen.findByText(
        "gh api repos/octocat/secret/actions/oidc/customization/sub --jq .sub_claim_prefix"
      )
    ).toBeTruthy();
  });

  it("doesn't look up a repository already named the immutable way", async () => {
    const fetch = respond(200);
    renderFor("octocat@583231/Hello-World@1296269");

    await new Promise((r) => setTimeout(r, 500));
    expect(fetch).not.toHaveBeenCalled();
  });
});
