import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";

export interface DataProxyConstructProps {
  readonly stage: string;
  /** Issuer URL of the data proxy's OIDC IdP, e.g. https://data.source.coop. */
  readonly issuerUrl: string;
  /** Platform-hosted opendata buckets the proxy reads/writes for connections. */
  readonly writableBuckets: string[];
  /**
   * Ids of the platform's own data connections — the only ones whose proxy
   * token may assume the access role.
   */
  readonly platformConnectionIds: string[];
}

/**
 * AWS-side identity for the data proxy.
 *
 * The proxy authenticates to AWS by presenting its own OIDC token (issuer = the
 * proxy URL, `aud = sts.amazonaws.com`) and calling `AssumeRoleWithWebIdentity`
 * — the same federated pattern customers use for their own connection roles
 * (see DataConnectionAuthenticationType.S3WebIdentityRole). This stands up
 * Source's own OIDC provider + role so the proxy can read/write the
 * platform-hosted opendata buckets on behalf of data connections.
 */
export class DataProxyConstruct extends Construct {
  public readonly accessRole: iam.Role;

  constructor(scope: Construct, id: string, props: DataProxyConstructProps) {
    super(scope, id);

    // Condition keys are keyed by the issuer host without scheme, e.g.
    // `data.source.coop:aud` — matching what the data-connection UI documents.
    const issuerHost = new URL(props.issuerUrl).host;

    const provider = new iam.OpenIdConnectProvider(this, "oidc-provider", {
      url: props.issuerUrl,
      clientIds: ["sts.amazonaws.com"],
    });

    this.accessRole = new iam.Role(this, "access-role", {
      roleName: `SourceDataProxy-S3Access-${props.stage}`,
      description:
        "Assumed by the data proxy via its OIDC IdP to read/write the platform-hosted opendata S3 buckets for data connections.",
      assumedBy: new iam.FederatedPrincipal(
        provider.openIdConnectProviderArn,
        {
          // The proxy mints a token for every data connection, including ones
          // an account creates for itself, and any of them may name this role.
          // `sub` (`scv1:conn:{id}`) is what tells them apart, so only the
          // platform's own connections may assume it. An allowlist, not a
          // denylist, so a subject nobody anticipated fails closed.
          StringEquals: {
            [`${issuerHost}:aud`]: "sts.amazonaws.com",
            [`${issuerHost}:sub`]: props.platformConnectionIds.map(
              (id) => `scv1:conn:${id}`
            ),
          },
        },
        "sts:AssumeRoleWithWebIdentity"
      ),
    });

    // ponytail: read+write across the hosted buckets, so keeping one account's
    // products out of another's prefix is the proxy's job alone. Move it into
    // IAM (a bucket policy keyed on `sub`) when subjects become account-scoped.
    for (const bucketName of props.writableBuckets) {
      s3.Bucket.fromBucketName(
        this,
        `bucket-${bucketName}`,
        bucketName
      ).grantReadWrite(this.accessRole);
    }

    new cdk.CfnOutput(this, "DataProxyS3AccessRoleArn", {
      value: this.accessRole.roleArn,
      description:
        "ARN the data proxy assumes (web identity) for hosted-bucket S3 access",
      exportName: `SourceDataProxy-S3AccessRoleArn-${props.stage}`,
    });
  }
}
