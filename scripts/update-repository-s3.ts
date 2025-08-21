import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import type { Product } from "../src/types/product_v2.js";

// Initialize DynamoDB client with local credentials
const client = new DynamoDBClient({
  region: 'local',
  endpoint: 'http://localhost:8000',
  credentials: {
    accessKeyId: 'local',
    secretAccessKey: 'local'
  }
});

const docClient = DynamoDBDocumentClient.from(client);

async function updateProductS3Config() {
  try {
    // Get the product
    const getResult = await docClient.send(new GetCommand({
      TableName: 'sc-products',
      Key: {
        product_id: 'de-mv',
        account_id: 'fiboa'
      }
    }));

    if (!getResult.Item) {
      console.error('Product not found');
      return;
    }

    const product = getResult.Item as Product;
    const now = new Date().toISOString();

    // Update the S3 configuration
    const updatedProduct: Product = {
      ...product,
      metadata: {
        ...product.metadata,
        mirrors: {
          "aws-us-west-2": {
            storage_type: "s3",
            connection_id: "default-connection",
            prefix: `${product.account_id}/${product.product_id}/`,
            config: {
              region: "us-west-2",
              bucket: "opendata.source.coop",
            },
            is_primary: true,
          },
        },
        primary_mirror: "aws-us-west-2",
      },
    };

    // Update the product
    await docClient.send(new PutCommand({
      TableName: 'sc-products',
      Item: updatedProduct
    }));

    console.log('Product S3 configuration updated successfully');
  } catch (error) {
    console.error('Error updating product:', error);
  }
}

updateProductS3Config(); 