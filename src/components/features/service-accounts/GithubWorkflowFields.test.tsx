import { fireEvent, render, screen } from "@testing-library/react";
import { Theme } from "@radix-ui/themes";
import { GithubWorkflowFields, NEW_GITHUB_WORKFLOW } from "./GithubWorkflowFields";

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

describe("GithubWorkflowFields", () => {
  it("offers a public repository's immutable name and puts it in the field", async () => {
    respond(200, { id: 1296269, name: "Hello-World", owner: { id: 583231, login: "octocat" } });
    const onChange = renderFor("octocat/hello-world");

    fireEvent.click(await screen.findByRole("button", { name: "Use it" }));

    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.github.com/repos/octocat/hello-world",
      expect.anything()
    );
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ repository: "octocat@583231/Hello-World@1296269" })
    );
  });

  it("gives the gh command for a repository GitHub doesn't show", async () => {
    respond(404);
    renderFor("octocat/secret");

    expect(await screen.findByText(/^gh api repos\/octocat\/secret --jq/)).toBeTruthy();
  });

  it("doesn't look up a repository already named the immutable way", async () => {
    const fetch = respond(200);
    renderFor("octocat@583231/Hello-World@1296269");

    await new Promise((r) => setTimeout(r, 500));
    expect(fetch).not.toHaveBeenCalled();
  });
});
