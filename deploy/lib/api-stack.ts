import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { DatabaseConstruct } from "./database-construct";
import { VercelConstruct } from "./vercel-construct";
import { AssetsConstruct } from "./assets-construct";

export class ApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const isProduction = props.stage === "prod";

    // Create database resources
    const database = new DatabaseConstruct(this, "database", {
      stage: props.stage,
      removalPolicy: isProduction
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
    });

    const writableBuckets = (
      isProduction
        ? [
            "ap-northeast-1",
            "ap-northeast-2",
            "ap-northeast-3",
            "ap-south-1",
            "ap-southeast-1",
            "ap-southeast-2",
            "ca-central-1",
            "eu-central-1",
            "eu-north-1",
            "eu-west-1",
            "eu-west-2",
            "eu-west-3",
            "sa-east-1",
            "us-east-1",
            "us-east-2",
            "us-west-1",
            "us-west-2",
          ]
        : ["dev.us-west-2"]
    ).map((region) => `${region}.opendata.source.coop`);

    // Create assets bucket
    const assets = new AssetsConstruct(this, "assets", {
      stage: props.stage,
      isProduction,
      removalPolicy: isProduction
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
    });

    // Create Vercel role with OIDC trust relationship
    const vercel = new VercelConstruct(this, "vercel", {
      projectName: "radiantearth",
      stage: props.stage,
      vercelEnvironment: isProduction
        ? ["production"]
        : ["preview", "development", "staging"],
      writableBuckets,
    });

    // Grant Vercel role access to DynamoDB tables
    for (const table of [
      database.accountsTable,
      database.productsTable,
      database.dataConnectionsTable,
      database.apiKeysTable,
      database.membershipsTable,
    ]) {
      table.grantReadWriteData(vercel.vercelRole);
    }

    // Grant Vercel role write access to assets bucket (for profile image uploads)
    assets.bucket.grantPut(vercel.vercelRole);
  }
}

interface ApiStackProps extends cdk.StackProps {
  readonly stage: string;
}
