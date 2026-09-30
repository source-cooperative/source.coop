import { githubWorkflowStep } from "./github-workflow";

describe("githubWorkflowStep", () => {
  it("uses configure-aws-credentials against the proxy, naming the account in the role ARN", () => {
    const step = githubWorkflowStep("https://data.source.coop", "nightly-sync");
    expect(step).toContain("uses: aws-actions/configure-aws-credentials@v6");
    // The action rebuilds any role that does not start with arn:aws as a bare
    // name, so the partition is aws whatever the proxy calls itself.
    expect(step).toContain("role-to-assume: arn:aws:iam::nightly-sync:role/FullAccess");
    expect(step).toContain("audience: https://data.source.coop");
    expect(step).toContain("sts-endpoint: https://data.source.coop/.sts");
    expect(step).toContain("AWS_ENDPOINT_URL_S3: https://data.source.coop");
    // Nothing account-specific beyond the id: no secret, no challenge.
    expect(step).not.toMatch(/eyJ/);
  });
});
