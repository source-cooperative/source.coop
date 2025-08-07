import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { DatabaseConstruct } from "./database-construct";
import { VercelConstruct } from "./vercel-construct";

export class ApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    // Create database resources
    const database = new DatabaseConstruct(this, "database", {
      removalPolicy:
        props.stage === "prod"
          ? cdk.RemovalPolicy.RETAIN
          : cdk.RemovalPolicy.DESTROY,
    });

    // Create Vercel role with OIDC trust relationship
    const vercel = new VercelConstruct(this, "vercel", {
      projectName: "radiantearth",
      stage: props.stage,
    });

    for (const table of [
      database.accountsTable,
      database.productsTable,
      database.dataConnectionsTable,
      database.apiKeysTable,
      database.membershipsTable,
    ]) {
      table.grantReadWriteData(vercel.vercelRole);
    }
  }
}

interface ApiStackProps extends cdk.StackProps {
  readonly stage: string;
}