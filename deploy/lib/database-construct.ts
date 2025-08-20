import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";

export interface DatabaseConstructProps {
  readonly removalPolicy?: cdk.RemovalPolicy;
  readonly stage: string;
}

interface TableDefinition {
  name: string;
  partitionKey: string;
  sortKey?: string;
  indexes?: Array<{
    name: string;
    partitionKey: string;
    sortKey?: string | dynamodb.Attribute;
  }>;
  removalPolicy?: cdk.RemovalPolicy;
  billingMode?: dynamodb.BillingMode;
}

export class DatabaseConstruct extends Construct {
  public readonly accountsTable: dynamodb.Table;
  public readonly productsTable: dynamodb.Table;
  public readonly dataConnectionsTable: dynamodb.Table;
  public readonly apiKeysTable: dynamodb.Table;
  public readonly membershipsTable: dynamodb.Table;

  constructor(
    scope: Construct,
    id: string,
    { removalPolicy, stage }: DatabaseConstructProps
  ) {
    super(scope, id);

    // Define tables
    this.accountsTable = this.createTable({
      name: "accounts",
      stage,
      partitionKey: "account_id",
      indexes: [
        {
          name: "account_type",
          partitionKey: "type",
        },
        {
          name: "identity_id",
          partitionKey: "identity_id",
        },
      ],
      removalPolicy,
    });

    this.apiKeysTable = this.createTable({
      name: "api-keys",
      stage,
      partitionKey: "access_key_id",
      indexes: [
        {
          name: "account_id",
          partitionKey: "account_id",
        },
      ],
      removalPolicy,
    });

    this.dataConnectionsTable = this.createTable({
      name: "data-connections",
      stage,
      partitionKey: "data_connection_id",
      removalPolicy,
    });

    this.membershipsTable = this.createTable({
      name: "memberships",
      stage,
      partitionKey: "membership_id",
      indexes: [
        {
          name: "account_id",
          partitionKey: "account_id",
        },
        {
          name: "membership_account_id",
          partitionKey: "membership_account_id",
        },
        {
          name: "membership_account_id_repository_id",
          partitionKey: "membership_account_id",
          sortKey: "repository_id",
        },
      ],
      removalPolicy,
    });

    this.productsTable = this.createTable({
      name: "products",
      stage,
      partitionKey: "account_id",
      sortKey: "product_id",
      indexes: [
        {
          name: "account_products",
          partitionKey: "account_id",
          sortKey: "product_id",
        },
        {
          name: "public_featured",
          partitionKey: "visibility",
          sortKey: {
            name: "featured",
            type: dynamodb.AttributeType.NUMBER,
          },
        },
      ],
      removalPolicy,
    });
  }

  /**
   * Helper function to create a table & indexes
   */
  private createTable({
    name,
    stage,
    partitionKey,
    sortKey,
    indexes,
    removalPolicy = cdk.RemovalPolicy.DESTROY,
    billingMode = dynamodb.BillingMode.PAY_PER_REQUEST,
  }: TableDefinition & { stage: string }): dynamodb.Table {
    const table = new dynamodb.Table(this, `${name}-table`, {
      tableName: `sc-${stage}-${name}`,
      partitionKey: {
        name: partitionKey,
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: sortKey
        ? typeof sortKey === "string"
          ? { name: sortKey, type: dynamodb.AttributeType.STRING }
          : sortKey
        : undefined,
      billingMode,
      removalPolicy,
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: true,
      },
    });

    // Add indexes
    indexes?.forEach((index) => {
      table.addGlobalSecondaryIndex({
        indexName: index.name,
        partitionKey: {
          name: index.partitionKey,
          type: dynamodb.AttributeType.STRING,
        },
        sortKey: index.sortKey
          ? typeof index.sortKey === "string"
            ? { name: index.sortKey, type: dynamodb.AttributeType.STRING }
            : index.sortKey
          : undefined,
        projectionType: dynamodb.ProjectionType.ALL,
      });
    });

    return table;
  }
}
