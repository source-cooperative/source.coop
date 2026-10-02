import { apiKeyEnvironment, githubWorkflowStep } from "./service-account-usage";

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
