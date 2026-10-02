/**
 * The `aws-actions/configure-aws-credentials` step that signs a GitHub Actions
 * job in as a service account, pointed at the data proxy's STS endpoint and
 * naming the account in `role-to-assume` — the account segment of the ARN, as
 * an AWS role's ARN names its account. The action mints the job's OIDC token
 * for the proxy (which `id-token: write` permits), exchanges it for
 * credentials carrying the account's memberships if the account trusts the
 * workflow's subject (ADR-014), and exports them for every later step. The
 * audience and STS endpoint are read from `AWS_ENDPOINT_URL_S3`, the variable
 * that also points S3 clients at the proxy, so the proxy is named once. The
 * partition is `aws` because the action treats any other value as a bare role
 * name. `FullAccess` is everything the account may do; `ReadOnly` narrows it
 * to reads.
 */
const signInStep = (account_id: string) => [
  `- name: Sign in to Source Cooperative as ${account_id}`,
  "  uses: aws-actions/configure-aws-credentials@v6",
  "  with:",
  `    role-to-assume: arn:aws:iam::${account_id}:role/FullAccess`,
  "    audience: ${{ env.AWS_ENDPOINT_URL_S3 }}",
  "    sts-endpoint: ${{ env.AWS_ENDPOINT_URL_S3 }}/.sts",
  "    aws-region: us-west-2",
];

/**
 * A whole GitHub Actions workflow that acts as a service account, ready to
 * save under `.github/workflows/` as it is, for the trusted `subject`: one job
 * running the sign-in step, with `AWS_ENDPOINT_URL_S3` set for the whole
 * workflow so every step's S3 client reaches the proxy. A subject pinned to an
 * environment needs the job to name it, or the token's subject names the ref
 * instead. `focus` is the sign-in step's lines, `[first, end)`, so a reader
 * adding it to a job of their own can see which part is Source Cooperative's.
 */
export function githubWorkflow(
  proxyOrigin: string,
  account_id: string,
  subject: string
): { code: string; focus: [number, number] } {
  const environment = subject.match(/:environment:(.+)$/)?.[1];
  const ref = subject.match(/:ref:(.+)$/)?.[1];
  const before = [
    "name: Source Cooperative",
    ref ? `on: workflow_dispatch  # run it on ${ref}, the ref ${account_id} trusts` : "on: workflow_dispatch",
    "env:",
    `  AWS_ENDPOINT_URL_S3: ${proxyOrigin}`,
    "",
    "jobs:",
    "  data:",
    "    runs-on: ubuntu-latest",
    ...(environment ? [`    environment: ${JSON.stringify(environment)}`] : []),
    "    permissions:",
    "      id-token: write",
    "      contents: read",
    "    steps:",
    "      # Any setup of your own (checkout, installing tools) can come first.",
  ];
  const step = signInStep(account_id).map((line) => `      ${line}`);
  return {
    code: [
      ...before,
      ...step,
      `      # From here on, any AWS SDK or the AWS CLI acts as ${account_id}.`,
      `      - run: aws s3 ls s3://${account_id.split("--")[0]}/`,
    ].join("\n"),
    focus: [before.length, before.length + step.length],
  };
}

/**
 * What a stock AWS SDK or the AWS CLI needs to sign in with an API key saved
 * to a file: it reads the file, exchanges the key at the proxy's STS endpoint
 * and refreshes on its own, so nothing else runs beside it. A key names its
 * own account, so the role ARN's account segment is ignored; it is filled in
 * to match the workflow.
 */
export function apiKeyEnvironment(proxyOrigin: string, account_id: string): string {
  return [
    "export AWS_REGION=us-west-2",
    `export AWS_ENDPOINT_URL_S3=${proxyOrigin}`,
    `export AWS_ENDPOINT_URL_STS=${proxyOrigin}/.sts`,
    `export AWS_ROLE_ARN=arn:aws:iam::${account_id}:role/FullAccess`,
    "export AWS_WEB_IDENTITY_TOKEN_FILE=/path/to/the/saved/key",
  ].join("\n");
}
