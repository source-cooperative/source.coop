/**
 * What a GitHub Actions job adds to act as a service account: the
 * `aws-actions/configure-aws-credentials` step, pointed at the data proxy's
 * STS endpoint and naming the account in `role-to-assume` — the account
 * segment of the ARN, as an AWS role's ARN names its account. The action
 * mints the job's OIDC token for the proxy, exchanges it for credentials
 * carrying the account's memberships if the account trusts the workflow's
 * subject (ADR-014), and exports them for every later step; `env` points
 * S3 clients at the proxy. The partition is `aws` because the action treats
 * any other value as a bare role name. `FullAccess` is everything the account
 * may do; `ReadOnly` narrows it to reads.
 */
export function githubWorkflowStep(proxyOrigin: string, account_id: string): string {
  return [
    "# In the job, with permissions: { id-token: write }",
    "env:",
    `  AWS_ENDPOINT_URL_S3: ${proxyOrigin}`,
    "steps:",
    `  - name: Sign in to Source Cooperative as ${account_id}`,
    "    uses: aws-actions/configure-aws-credentials@v6",
    "    with:",
    `      role-to-assume: arn:aws:iam::${account_id}:role/FullAccess`,
    `      audience: ${proxyOrigin}`,
    `      sts-endpoint: ${proxyOrigin}/.sts`,
    "      aws-region: us-west-2",
  ].join("\n");
}
