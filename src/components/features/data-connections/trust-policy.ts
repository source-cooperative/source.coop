import { connectionSubject, SHARED_AUDIENCE } from "@/types/data-connection";

const ROLE_ARN = /^arn:(aws[a-z-]*):iam::(\d{12}):role\//;

/**
 * The IAM trust policy that lets the data proxy at `proxyOrigin` assume
 * `roleArn` for one connection and no other (data.source.coop ADR-006). The
 * proxy origin is its OIDC issuer, so the provider ARN and condition keys are
 * named after it; the AWS account and partition come from the role ARN, and
 * stand as placeholders until it's a valid one. `audience` is the `aud` the
 * proxy's tokens carry for the connection, the shared one unless it has its
 * own.
 */
export function trustPolicy(
  proxyOrigin: string,
  roleArn: string,
  connectionId: string,
  audience: string = SHARED_AUDIENCE
): string {
  const [, partition = "aws", account = "<ACCOUNT_ID>"] =
    ROLE_ARN.exec(roleArn.trim()) ?? [];
  const issuer = proxyOrigin.replace(/^https:\/\//, "").replace(/\/$/, "");
  const policy = {
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Principal: {
          Federated: `arn:${partition}:iam::${account}:oidc-provider/${issuer}`,
        },
        Action: "sts:AssumeRoleWithWebIdentity",
        Condition: {
          StringEquals: {
            [`${issuer}:aud`]: audience,
            [`${issuer}:sub`]: connectionSubject(connectionId || "<CONNECTION_ID>"),
          },
        },
      },
    ],
  };
  return JSON.stringify(policy, null, 2);
}
