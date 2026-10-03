import { apiKeyEnvironment, githubWorkflow } from "./service-account-usage";

const REF = "repo:acme/data:ref:refs/heads/main";
const ENVIRONMENT = "repo:acme@1/data@2:environment:production";

describe("githubWorkflow", () => {
  // Pasted as-is, so the nesting is the contract: env belongs to the workflow,
  // permissions and steps to the job.
  it("is a whole workflow: env for every step, one job permitted to mint an OIDC token, with the sign-in step", () => {
    const { code: workflow } = githubWorkflow("https://data.source.coop", "acme--nightly-sync", REF);
    expect(workflow).toMatch(
      /^name: .+\non:\n {2}schedule:\n {4}# Nightly @ 2am UTC; works only if main is the default branch\n {4}- cron: "0 2 \* \* \*"\n {2}workflow_dispatch:.*\nenv:\n {2}# .*data proxy.*\n {2}AWS_ENDPOINT_URL: https:\/\/data.source.coop\n/
    );
    expect(workflow).toContain(
      "\njobs:\n  data:\n    runs-on: ubuntu-latest\n    permissions:\n      id-token: write  # required for aws-actions/configure-aws-credentials\n"
    );
    expect(workflow).toContain(
      "\n    steps:\n      # Any setup of your own (checkout, installing tools) can come first.\n\n      - name: Sign in to Source Cooperative as acme--nightly-sync\n        uses: aws-actions/configure-aws-credentials@v6\n        with:\n"
    );
    expect(workflow).toContain("\n      - run: aws s3 ls s3://acme/");
    expect(workflow).not.toContain("environment:");
  });

  it("focuses on exactly the env block, the OIDC permission and the sign-in step", () => {
    const { code, focus } = githubWorkflow("https://data.source.coop", "acme--nightly-sync", REF);
    const lines = code.split("\n");
    const [env, permissions, step] = focus.map((range) => lines.slice(...range));
    expect(env).toEqual([
      "env:",
      expect.stringMatching(/^ {2}# .*data proxy/),
      "  AWS_ENDPOINT_URL: https://data.source.coop",
    ]);
    expect(permissions).toEqual(["    permissions:", expect.stringMatching(/^ {6}id-token: write /)]);
    expect(step[0]).toBe("      - name: Sign in to Source Cooperative as acme--nightly-sync");
    expect(step.at(-1)).toBe("          aws-region: us-west-2");

    // A trust pinned to an environment adds the job's environment line after the env block.
    const pinned = githubWorkflow("https://data.source.coop", "acme--nightly-sync", ENVIRONMENT);
    const [, environment] = pinned.focus.map((range) => pinned.code.split("\n").slice(...range));
    expect(environment).toEqual([expect.stringMatching(/^ {4}environment: "production" {2}# Must run on production/)]);
  });

  it("names the environment a trust is pinned to, so the token's subject carries it", () => {
    const { code: workflow } = githubWorkflow("https://data.source.coop", "acme--nightly-sync", ENVIRONMENT);
    expect(workflow).toContain(
      '\n    runs-on: ubuntu-latest\n    environment: "production"  # Must run on production as per Service Account "acme--nightly-sync" trust policy.\n'
    );
  });

  it("uses configure-aws-credentials against the proxy, naming the account in the role ARN", () => {
    const { code: workflow } = githubWorkflow("https://data.source.coop", "nightly-sync", REF);
    expect(workflow).toContain("uses: aws-actions/configure-aws-credentials@v6");
    // The action rebuilds any role that does not start with arn:aws as a bare
    // name, so the partition is aws whatever the proxy calls itself.
    expect(workflow).toContain("role-to-assume: arn:aws:iam::nightly-sync:role/FullAccess");
    expect(workflow).toContain("audience: ${{ env.AWS_ENDPOINT_URL }}");
    expect(workflow).toContain("sts-endpoint: ${{ env.AWS_ENDPOINT_URL }}/.sts");
    // Nothing account-specific beyond the id: no secret, no challenge.
    expect(workflow).not.toMatch(/eyJ/);
  });
});

describe("apiKeyEnvironment", () => {
  it("points the SDK's web-identity provider at a saved key and the proxy's STS", () => {
    const env = apiKeyEnvironment("https://data.source.coop", "nightly-sync");
    expect(env).toBe(
      [
        "export AWS_REGION=us-west-2",
        "export AWS_ENDPOINT_URL_S3=https://data.source.coop",
        "export AWS_ENDPOINT_URL_STS=https://data.source.coop/.sts",
        "export AWS_ROLE_ARN=arn:aws:iam::nightly-sync:role/FullAccess",
        "export AWS_WEB_IDENTITY_TOKEN_FILE=/path/to/the/saved/key",
      ].join("\n")
    );
  });
});
