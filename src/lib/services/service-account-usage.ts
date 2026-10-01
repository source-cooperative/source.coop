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

/**
 * What a stock AWS SDK or the AWS CLI needs to sign in with an API key saved
 * to a file: it reads the file, exchanges the key at the proxy's STS endpoint
 * and refreshes on its own, so nothing else runs beside it. A key names its
 * own account, so the role ARN's account segment is ignored; it is filled in
 * to match the workflow step.
 */
export function apiKeyEnvironment(proxyOrigin: string, account_id: string): string {
  return [
    `export AWS_ROLE_ARN=arn:aws:iam::${account_id}:role/FullAccess`,
    "export AWS_WEB_IDENTITY_TOKEN_FILE=/path/to/the/saved/key",
    `export AWS_ENDPOINT_URL_STS=${proxyOrigin}/.sts`,
    `export AWS_ENDPOINT_URL_S3=${proxyOrigin}`,
    "export AWS_REGION=us-west-2",
  ].join("\n");
}
