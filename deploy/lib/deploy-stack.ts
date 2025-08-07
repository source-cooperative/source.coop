import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { DatabaseConstruct } from "./database-construct";

export class ApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create database resources
    const database = new DatabaseConstruct(this, "Database", {
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For development - change to RETAIN for production
    });

    // You can now access the tables via:
    // database.accountsTable
    // database.productsTable
  }
}
