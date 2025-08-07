import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";

export interface DatabaseConstructProps {
  readonly removalPolicy?: cdk.RemovalPolicy;
}

interface TableDefinition {
  name: string;
  partitionKey: string;
  sortKey?: string;
  indexes?: Array<{
    name: string;
    partitionKey: string;
    sortKey?: string;
  }>;
  removalPolicy?: cdk.RemovalPolicy;
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
    { removalPolicy }: DatabaseConstructProps
  ) {
    super(scope, id);

    // Define tables
    this.accountsTable = this.createTable({
      name: "accounts",
      partitionKey: "account_id",
      sortKey: "type",
      indexes: [
        {
          name: "AccountTypeIndex",
          partitionKey: "type",
          sortKey: "account_id",
        },
      ],
      removalPolicy,
    });

    this.apiKeysTable = this.createTable({
      name: "api-keys",
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
      partitionKey: "data_connection_id",
      sortKey: "account_id",
      removalPolicy,
    });

    this.membershipsTable = this.createTable({
      name: "memberships",
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
      partitionKey: "product_id",
      sortKey: "account_id",
      indexes: [
        {
          name: "AccountProductsIndex",
          partitionKey: "account_id",
          sortKey: "created_at",
        },
        {
          name: "PublicProductsIndex",
          partitionKey: "visibility",
          sortKey: "created_at",
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
    partitionKey,
    sortKey,
    indexes,
    removalPolicy = cdk.RemovalPolicy.DESTROY,
  }: TableDefinition): dynamodb.Table {
    const table = new dynamodb.Table(this, `${name}-table`, {
      tableName: `sc-${name}`,
      partitionKey: {
        name: partitionKey,
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: sortKey
        ? { name: sortKey, type: dynamodb.AttributeType.STRING }
        : undefined,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: removalPolicy,
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
          ? { name: index.sortKey, type: dynamodb.AttributeType.STRING }
          : undefined,
        projectionType: dynamodb.ProjectionType.ALL,
      });
    });

    return table;
  }
}
