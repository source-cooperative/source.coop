import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { DatabaseConstruct } from "./database-construct";
import { VercelConstruct } from "./vercel-construct";
import { AssetsConstruct } from "./assets-construct";

export class ApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const isProduction = props.stage === "prod";
    const isStaging = props.stage === "dev" || props.stage === "staging";

    // Create database resources
    const database = new DatabaseConstruct(this, "database", {
      stage: props.stage,
      removalPolicy: isProduction
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
    });

    // Create assets bucket
    const assets = new AssetsConstruct(
      this,
      "assets",
      isProduction
        ? {
            bucketName: `assets.source.coop`,
            allowedOrigins: ["https://source.coop"],
            removalPolicy: cdk.RemovalPolicy.RETAIN,
          }
        : {
            bucketName: isStaging
              ? `assets.staging.source.coop`
              : `assets.${props.stage}.source.coop`,
            allowedOrigins: ["*"],
            removalPolicy: cdk.RemovalPolicy.DESTROY,
          }
    );

    // Create Vercel role with OIDC trust relationship
    const vercel = new VercelConstruct(this, "vercel", {
      projectName: "radiantearth",
      stage: props.stage,
      vercelEnvironment: isProduction
        ? ["production"]
        : ["preview", "development", "staging"],
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
    assets.bucket.grantDelete(vercel.vercelRole);
  }
}

interface ApiStackProps extends cdk.StackProps {
  readonly stage: string;
}
