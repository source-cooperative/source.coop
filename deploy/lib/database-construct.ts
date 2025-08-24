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
          // fetch all accounts of a given type
          name: "account_type",
          partitionKey: "type",
          sortKey: "account_id",
        },
        {
          // fetch an account by Ory identity_id
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
          // fetch all API keys for a given account
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
          // fetch all memberships for a given account
          name: "account_id",
          partitionKey: "account_id",
        },
        {
          // fetch all memberships for a given account and repository
          name: "membership_account_id_repository_id",
          partitionKey: "membership_account_id",
          // TODO: If we don't have a repository_id on the membership, it won't be in the index
          sortKey: "repository_id",
        },
        {
          // fetch all memberships for a given account
          name: "membership_account_id",
          partitionKey: "membership_account_id",
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
          // fetch all public products
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
