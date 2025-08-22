import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

export interface VercelConstructProps {
  readonly projectName: string;
  readonly stage: string;
  readonly vercelEnvironment: string[];
}

export class VercelConstruct extends Construct {
  public readonly vercelRole: iam.Role;

  constructor(scope: Construct, id: string, props: VercelConstructProps) {
    super(scope, id);

    const accountId = cdk.Stack.of(this).account;

    this.vercelRole = new iam.Role(this, "vercel-runtime-role", {
      roleName: `SourceFrontend-VercelRuntime-${props.stage}`,
      description: "Created by CDK within the source.coop codebase",
      assumedBy: new iam.FederatedPrincipal(
        `arn:aws:iam::${accountId}:oidc-provider/oidc.vercel.com/${props.projectName}`,
        {
          StringEquals: {
            [`oidc.vercel.com/${props.projectName}:aud`]: `https://vercel.com/${props.projectName}`,
            [`oidc.vercel.com/${props.projectName}:sub`]:
              props.vercelEnvironment.map(
                (environment) =>
                  `owner:${props.projectName}:project:source-cooperative:environment:${environment}`
              ),
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
