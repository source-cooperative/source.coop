import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
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
 * - CloudFront distribution for CDN delivery
 * - Origin Access Control for secure S3 access
 */
export class AssetsConstruct extends Construct {
  public readonly bucket: s3.Bucket;
  public readonly bucketName: string;
  public readonly distribution: cloudfront.Distribution;
  public readonly distributionDomainName: string;

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
      publicReadAccess: false, // CloudFront will access via OAC
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
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

    // Create CloudFront distribution
    this.distribution = new cloudfront.Distribution(this, "assets-distribution", {
      defaultBehavior: {
        origin: new origins.S3Origin(this.bucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        compress: true,
      },
      comment: `Assets CDN for ${stage}`,
      enabled: true,
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100, // Use only North America and Europe edge locations
    });

    this.distributionDomainName = this.distribution.distributionDomainName;

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

    new cdk.CfnOutput(this, "AssetsDistributionId", {
      value: this.distribution.distributionId,
      description: "CloudFront distribution ID for assets",
      exportName: `sc-${stage}-assets-distribution-id`,
    });

    new cdk.CfnOutput(this, "AssetsDistributionDomainName", {
      value: this.distributionDomainName,
      description: "CloudFront distribution domain name for assets",
      exportName: `sc-${stage}-assets-distribution-domain`,
    });
  }
}
