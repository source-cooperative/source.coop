"use server";

import { STSClient, AssumeRoleCommand } from "@aws-sdk/client-sts";
import { getPageSession } from "@/lib/api/utils";
import { isAuthorized } from "@/lib/api/authz";
import { Actions, DataProvider } from "@/types";
import { CONFIG, dataConnectionsTable, LOGGER, productsTable } from "@/lib";
import { z } from "zod";

export interface TemporaryCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
  expiration: string;
  bucket: string;
  region: string;
}

export interface GetCredentialsParams {
  accountId: string;
  productId: string;
  prefix?: string;
  durationSeconds?: number;
}

/**
 * Generate temporary AWS credentials using STS AssumeRole
 *
 * Creates scoped credentials with permissions limited to:
 * - PutObject in the specified bucket/prefix
 * - GetObject for uploads verification
 *
 * @param params - Account and product identifiers
 * @returns Temporary credentials with 1-hour expiration
 */
export async function getTemporaryCredentials({
  accountId,
  productId,
  durationSeconds = 3600,
}: GetCredentialsParams): Promise<TemporaryCredentials> {
  // Authenticate user
  const session = await getPageSession();
  if (!session?.account) {
    throw new Error("Unauthorized: No valid session");
  }

  // Check authorization
  const product = await productsTable.fetchById(accountId, productId);
  if (!product)
    throw new Error(
      `Product ${accountId}/${productId} not found for temporary credentials`
    );

  if (!isAuthorized(session, product, Actions.WriteRepositoryData))
    throw new Error(
      `Unauthorized: User does not have permission to upload to ${accountId}/${productId}`
    );

  // TODO: Ideally, we would be able to read this directly from the product, however the product mirrors seem to have incorrect bucket values
  const dataConnection = await dataConnectionsTable.fetchById(
    product.metadata.primary_mirror
  );
  if (!dataConnection)
    throw new Error(
      `Data connection ${product.metadata.primary_mirror} not found`
    );
  if (dataConnection.details.provider !== DataProvider.S3)
    throw new Error("Non-S3 providers are not supported.");

  const primaryMirror =
    product.metadata.mirrors[product.metadata.primary_mirror];

  const { bucket, region, prefix } = z
    .object({
      bucket: z.string(),
      region: z.string(),
      prefix: z.string(),
    })
    .parse({
      bucket: dataConnection.details.bucket,
      region: dataConnection.details.region,
      prefix: primaryMirror.prefix,
    });

  // Construct S3 path: accountId/productId/prefix/*

  try {
    const stsClient = new STSClient({
      region,
      credentials: CONFIG.database.credentials,
    });

    const s3Path = [accountId, productId, prefix].filter(Boolean).join("/");

    // Use AssumeRole to get temporary credentials
    const response = await stsClient.send(
      new AssumeRoleCommand({
        RoleArn: CONFIG.uploads.accessRoleArn,
        RoleSessionName: `upload-${accountId}-${productId}-${Date.now()}`,
        DurationSeconds: durationSeconds,
        // Create session policy to scope permissions
        Policy: JSON.stringify({
          Version: "2012-10-17",
          Statement: [
            {
              Sid: "AllowUploadToPrefix",
              Effect: "Allow",
              Action: [
                "s3:PutObject",
                "s3:PutObjectAcl",
                "s3:GetObject",
                "s3:AbortMultipartUpload",
                "s3:ListMultipartUploadParts",
              ],
              Resource: `arn:aws:s3:::${bucket}/${s3Path}/*`,
            },
            {
              Sid: "AllowListBucket",
              Effect: "Allow",
              Action: "s3:ListBucket",
              Resource: `arn:aws:s3:::${bucket}`,
              Condition: {
                StringLike: {
                  "s3:prefix": [`${s3Path}/*`],
                },
              },
            },
          ],
        }),
      })
    );

    if (!response.Credentials) {
      throw new Error("STS did not return credentials");
    }

    LOGGER.info("Generated temporary credentials", {
      operation: "getTemporaryCredentials",
      metadata: {
        accountId,
        productId,
        prefix,
        bucket,
        expiration: response.Credentials.Expiration,
      },
    });

    return {
      accessKeyId: response.Credentials.AccessKeyId!,
      secretAccessKey: response.Credentials.SecretAccessKey!,
      sessionToken: response.Credentials.SessionToken!,
      expiration: response.Credentials.Expiration!.toISOString(),
      bucket,
      region,
    };
  } catch (error) {
    LOGGER.error("Failed to generate temporary credentials", {
      operation: "getTemporaryCredentials",
      metadata: { accountId, productId, prefix, error },
    });
    throw new Error(
      `Failed to generate credentials: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Refresh temporary credentials if they're about to expire
 *
 * @param params - Account and product identifiers
 * @param currentExpiration - Current credential expiration time
 * @returns New credentials if refresh is needed, null otherwise
 */
export async function refreshCredentialsIfNeeded(
  params: GetCredentialsParams,
  currentExpiration: string
): Promise<TemporaryCredentials | null> {
  const expirationTime = new Date(currentExpiration).getTime();
  const now = Date.now();
  const timeUntilExpiration = expirationTime - now;

  // Refresh if less than 5 minutes until expiration
  const FIVE_MINUTES = 5 * 60 * 1000;
  if (timeUntilExpiration < FIVE_MINUTES) {
    LOGGER.info("Refreshing credentials", {
      operation: "refreshCredentialsIfNeeded",
      metadata: {
        ...params,
        timeUntilExpiration,
      },
    });
    return getTemporaryCredentials(params);
  }

  return null;
}
