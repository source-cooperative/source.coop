import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";

export interface AssetsConstructProps {
  readonly isProduction: boolean;
  readonly stage: string;
  readonly removalPolicy?: cdk.RemovalPolicy;
}

/**
 * Creates an S3 bucket for serving static assets like profile images, logos, etc.
 *
 * Features:
 * - S3 bucket with versioning and server-side encryption
 * - CORS configuration for web uploads
 * - Public read access for assets
 *
 * Note: CloudFront distribution should be manually configured to serve this bucket
 * with custom domain and SSL certificate.
 */
export class AssetsConstruct extends Construct {
  public readonly bucket: s3.Bucket;
  public readonly bucketName: string;

  constructor(scope: Construct, id: string, props: AssetsConstructProps) {
    super(scope, id);

    const { stage, removalPolicy = cdk.RemovalPolicy.RETAIN } = props;

    // Create S3 bucket for assets
    this.bucketName = props.isProduction
      ? `assets.source.coop`
      : `assets.${stage}.source.coop`;
    this.bucket = new s3.Bucket(this, "assets-bucket", {
      bucketName: this.bucketName,
      removalPolicy,
      autoDeleteObjects: removalPolicy === cdk.RemovalPolicy.DESTROY,
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      publicReadAccess: true,
      blockPublicAccess: new s3.BlockPublicAccess({
        blockPublicAcls: false,
        blockPublicPolicy: false,
        ignorePublicAcls: false,
        restrictPublicBuckets: false,
      }),
      cors: [
        {
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.PUT,
            s3.HttpMethods.POST,
            s3.HttpMethods.HEAD,
          ],
          allowedOrigins: ["*.vercel.app", "*.source.coop"],
          allowedHeaders: ["*"],
          exposedHeaders: ["ETag"],
          maxAge: 3000,
        },
      ],
    });

    // Outputs
    new cdk.CfnOutput(this, "AssetsBucketName", {
      value: this.bucket.bucketName,
      description: "Name of the assets S3 bucket",
      exportName: `sc-${stage}-assets-bucket-name`,
    });

    new cdk.CfnOutput(this, "AssetsBucketArn", {
      value: this.bucket.bucketArn,
      description: "ARN of the assets S3 bucket",
      exportName: `sc-${stage}-assets-bucket-arn`,
    });

    new cdk.CfnOutput(this, "AssetsBucketDomainName", {
      value: this.bucket.bucketDomainName,
      description: "Domain name of the assets S3 bucket",
      exportName: `sc-${stage}-assets-bucket-domain`,
    });
  }
}
