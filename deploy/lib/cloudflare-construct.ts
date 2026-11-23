import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

export interface CloudflareConstructProps {
  readonly stage: string;
}

/**
 * The identity the Worker uses for DynamoDB and the assets bucket. Workers
 * can't present an OIDC token to AWS, so this is an IAM user. Create its access
 * key by hand (`aws iam create-access-key`) and store it as the Worker's
 * AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY secrets, so no secret passes
 * through CloudFormation.
 */
export class CloudflareConstruct extends Construct {
  public readonly user: iam.User;

  constructor(scope: Construct, id: string, props: CloudflareConstructProps) {
    super(scope, id);

    this.user = new iam.User(this, "cloudflare-runtime-user", {
      userName: `SourceFrontend-CloudflareRuntime-${props.stage}`,
    });
  }
}
