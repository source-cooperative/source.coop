import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

export interface VercelConstructProps {
  readonly projectName: string;
  readonly stage: string;
}

export class VercelConstruct extends Construct {
  public readonly vercelRole: iam.Role;

  constructor(scope: Construct, id: string, props: VercelConstructProps) {
    super(scope, id);

    const accountId = cdk.Stack.of(this).account;

    this.vercelRole = new iam.Role(this, "vercel-role", {
      assumedBy: new iam.FederatedPrincipal(
        `arn:aws:iam::${accountId}:oidc-provider/oidc.vercel.com/${props.projectName}`,
        {
          StringEquals: {
            "oidc.vercel.com:aud": `https://oidc.vercel.com/${props.projectName}`,
          },
        },
        "sts:AssumeRoleWithWebIdentity"
      ),
    });

    // Output the role ARN for reference
    new cdk.CfnOutput(this, "VercelRoleArn", {
      value: this.vercelRole.roleArn,
      description: "ARN of the Vercel IAM role",
    });
  }
}
