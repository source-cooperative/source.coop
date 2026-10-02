import { apiKeyEnvironment, githubWorkflow, githubWorkflowStep } from "./service-account-usage";

const REF = "repo:acme/data:ref:refs/heads/main";
const ENVIRONMENT = "repo:acme@1/data@2:environment:production";

describe("githubWorkflow", () => {
  // Pasted as-is, so the nesting is the contract: env belongs to the workflow,
  // permissions and steps to the job.
  it("is a whole workflow: env for every step, one job permitted to mint an OIDC token, with the sign-in step", () => {
    const workflow = githubWorkflow("https://data.source.coop", "acme--nightly-sync", REF);
    expect(workflow).toMatch(
      /^name: .+\non: workflow_dispatch {2}# run it on refs\/heads\/main.*\nenv:\n {2}AWS_ENDPOINT_URL_S3: https:\/\/data.source.coop\n/
    );
    expect(workflow).toContain(
      "\njobs:\n  data:\n    runs-on: ubuntu-latest\n    permissions:\n      id-token: write\n"
    );
    expect(workflow).toContain(
      "\n    steps:\n      - name: Sign in to Source Cooperative as acme--nightly-sync\n        uses: aws-actions/configure-aws-credentials@v6\n        with:\n"
    );
    expect(workflow).toContain("\n      - run: aws s3 ls s3://acme/");
    expect(workflow).not.toContain("environment:");
  });

  it("names the environment a trust is pinned to, so the token's subject carries it", () => {
    const workflow = githubWorkflow("https://data.source.coop", "acme--nightly-sync", ENVIRONMENT);
    expect(workflow).toContain('\n    runs-on: ubuntu-latest\n    environment: "production"\n');
  });

  it("uses configure-aws-credentials against the proxy, naming the account in the role ARN", () => {
    const workflow = githubWorkflow("https://data.source.coop", "nightly-sync", REF);
    expect(workflow).toContain("uses: aws-actions/configure-aws-credentials@v6");
    // The action rebuilds any role that does not start with arn:aws as a bare
    // name, so the partition is aws whatever the proxy calls itself.
    expect(workflow).toContain("role-to-assume: arn:aws:iam::nightly-sync:role/FullAccess");
    expect(workflow).toContain("audience: ${{ env.AWS_ENDPOINT_URL_S3 }}");
    expect(workflow).toContain("sts-endpoint: ${{ env.AWS_ENDPOINT_URL_S3 }}/.sts");
    // Nothing account-specific beyond the id: no secret, no challenge.
    expect(workflow).not.toMatch(/eyJ/);
  });
});

describe("githubWorkflowStep", () => {
  it("is the sign-in step alone, setting the proxy on itself and reading it in `with`", () => {
    const step = githubWorkflowStep("https://data.source.coop", "acme--nightly-sync", REF);
    expect(step).toContain(
      "\n- name: Sign in to Source Cooperative as acme--nightly-sync\n  uses: aws-actions/configure-aws-credentials@v6\n  env:\n    AWS_ENDPOINT_URL_S3: https://data.source.coop\n  with:\n"
    );
    expect(step).toContain("    audience: ${{ env.AWS_ENDPOINT_URL_S3 }}\n");
    expect(step).not.toContain("jobs:");
    expect(step).not.toContain("environment:");
  });

  it("says which environment the job must name when the trust is pinned to one", () => {
    const step = githubWorkflowStep("https://data.source.coop", "acme--nightly-sync", ENVIRONMENT);
    expect(step).toMatch(/^# In a job .* and environment: "production"/);
  });
});

describe("apiKeyEnvironment", () => {
  it("points the SDK's web-identity provider at a saved key and the proxy's STS", () => {
    const env = apiKeyEnvironment("https://data.source.coop", "nightly-sync");
    expect(env).toContain("export AWS_WEB_IDENTITY_TOKEN_FILE=");
    expect(env).toContain("export AWS_ENDPOINT_URL_STS=https://data.source.coop/.sts");
    expect(env).toContain("export AWS_ROLE_ARN=arn:aws:iam::nightly-sync:role/FullAccess");
  });
});
