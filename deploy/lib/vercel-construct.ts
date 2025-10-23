import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";

export interface VercelConstructProps {
  readonly projectName: string;
  readonly stage: string;
  readonly vercelEnvironment: string[];
  readonly s3Bucket: s3.IBucket;
}

export class VercelConstruct extends Construct {
  public readonly vercelRole: iam.Role;
  public readonly s3AccessRole: iam.Role;

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

    this.s3AccessRole = new iam.Role(this, "s3-upload-role", {
      roleName: `SourceFrontend-S3UploadAccess-${props.stage}`,
      description:
        "Role used by Vercel to generate temporary credentials for S3 uploads",
      assumedBy: this.vercelRole,
    });

    // Grant Vercel role permission to assume this role
    this.s3AccessRole.grantAssumeRole(this.vercelRole);

    // Grant permissions for multipart uploads and reads
    // (session policies will further restrict access to specific prefixes)
    props.s3Bucket.grantReadWrite(this.s3AccessRole);

    this.s3AccessRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "AllowListBucket",
        effect: iam.Effect.ALLOW,
        actions: ["s3:ListBucket"],
        resources: [props.s3Bucket.bucketArn],
      })
    );

    // Output the role ARN for reference
    new cdk.CfnOutput(this, "VercelRoleArn", {
      value: this.vercelRole.roleArn,
      description: "ARN of the Vercel IAM role",
    });

    new cdk.CfnOutput(this, "S3UploadAccessRoleArn", {
      value: this.s3AccessRole.roleArn,
      description:
        "ARN of the S3 upload access role for STS temporary credentials",
      exportName: `SourceFrontend-S3UploadAccessRoleArn-${props.stage}`,
    });
  }
}
