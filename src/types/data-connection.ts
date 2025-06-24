/**
 * @fileoverview Type definitions and schemas for Data Connection entities.
 *
 * This module defines the core data structures, enums, and Zod schemas used for
 * data connection management in the Source Cooperative application.
 *
 * @module types/data-connection
 * @requires zod
 * @requires @asteasolutions/zod-to-openapi
 */

import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import {
  MIN_ID_LENGTH,
  MAX_ID_LENGTH,
  ID_REGEX,
  RepositoryDataMode,
  RepositoryDataModeSchema,
  AccountFlags,
} from "./shared";

extendZodWithOpenApi(z);

export enum DataProvider {
  S3 = "s3",
  Azure = "az",
  GCP = "gcp",
}

export enum S3Regions {
  AF_SOUTH_1 = "af-south-1",
  AP_EAST_1 = "ap-east-1",
  AP_NORTHEAST_1 = "ap-northeast-1",
  AP_NORTHEAST_2 = "ap-northeast-2",
  AP_NORTHEAST_3 = "ap-northeast-3",
  AP_SOUTH_1 = "ap-south-1",
  AP_SOUTH_2 = "ap-south-2",
  AP_SOUTHEAST_1 = "ap-southeast-1",
  AP_SOUTHEAST_2 = "ap-southeast-2",
  AP_SOUTHEAST_3 = "ap-southeast-3",
  AP_SOUTHEAST_4 = "ap-southeast-4",
  AP_SOUTHEAST_5 = "ap-southeast-5",
  CA_CENTRAL_1 = "ca-central-1",
  CA_WEST_1 = "ca-west-1",
  CN_NORTH_1 = "cn-north-1",
  CN_NORTHWEST_1 = "cn-northwest-1",
  EU_CENTRAL_1 = "eu-central-1",
  EU_CENTRAL_2 = "eu-central-2",
  EU_NORTH_1 = "eu-north-1",
  EU_SOUTH_1 = "eu-south-1",
  EU_SOUTH_2 = "eu-south-2",
  EU_WEST_1 = "eu-west-1",
  EU_WEST_2 = "eu-west-2",
  EU_WEST_3 = "eu-west-3",
  IL_CENTRAL_1 = "il-central-1",
  ME_CENTRAL_1 = "me-central-1",
  ME_SOUTH_1 = "me-south-1",
  SA_EAST_1 = "sa-east-1",
  US_EAST_1 = "us-east-1",
  US_EAST_2 = "us-east-2",
  US_GOV_EAST_1 = "us-gov-east-1",
  US_GOV_WEST_1 = "us-gov-west-1",
  US_WEST_1 = "us-west-1",
  US_WEST_2 = "us-west-2",
}

export enum AzureRegions {
  WEST_EUROPE = "westeurope",
}

export enum DataConnectionAuthenticationType {
  S3AccessKey = "s3_access_key",
  S3IAMRole = "s3_iam_role",
  AzureSasToken = "az_sas_token",
  S3ECSTaskRole = "s3_ecs_task_role",
  S3Local = "s3_local",
}

export const S3LocalAuthenticationSchema = z
  .object({
    type: z.literal(DataConnectionAuthenticationType.S3Local),
  })
  .openapi("S3LocalAuthentication");

export const S3ECSTaskRoleAuthenticationSchema = z
  .object({
    type: z.literal(DataConnectionAuthenticationType.S3ECSTaskRole),
  })
  .openapi("S3ECSTaskRoleAuthentication");

export const S3AccessKeyAuthenticationSchema = z
  .object({
    type: z.literal(DataConnectionAuthenticationType.S3AccessKey),
    access_key_id: z.string(),
    secret_access_key: z.string(),
  })
  .openapi("S3AccessKeyAuthentication");

export const AzureSasTokenAuthenticationSchema = z
  .object({
    type: z.literal(DataConnectionAuthenticationType.AzureSasToken),
    sas_token: z.string(),
  })
  .openapi("AzureSasTokenAuthentication");

export const DataConnectionAuthenticationSchema = z
  .discriminatedUnion("type", [
    S3AccessKeyAuthenticationSchema,
    AzureSasTokenAuthenticationSchema,
    S3ECSTaskRoleAuthenticationSchema,
    S3LocalAuthenticationSchema,
  ])
  .openapi("DataConnectionAuthentication");

export type DataConnectionAuthentication = z.infer<
  typeof DataConnectionAuthenticationSchema
>;

export const S3DataConnectionSchema = z
  .object({
    provider: z.literal(DataProvider.S3),
    bucket: z.string(),
    base_prefix: z.string(),
    region: z.nativeEnum(S3Regions),
  })
  .openapi("S3DataConnection");

export const AzureDataConnectionSchema = z
  .object({
    provider: z.literal(DataProvider.Azure),
    account_name: z.string(),
    container_name: z.string(),
    base_prefix: z.string(),
    region: z.nativeEnum(AzureRegions),
  })
  .openapi("AzureDataConnection");

export type S3DataConnection = z.infer<typeof S3DataConnectionSchema>;
export type AzureDataConnection = z.infer<typeof AzureDataConnectionSchema>;

export const DataConnnectionDetailsSchema = z
  .discriminatedUnion("provider", [
    S3DataConnectionSchema,
    AzureDataConnectionSchema,
  ])
  .openapi("DataConnectionDetails");

export type DataConnectionDetails = z.infer<
  typeof DataConnnectionDetailsSchema
>;

export const DataConnectionSchema = z
  .object({
    data_connection_id: z
      .string()
      .min(MIN_ID_LENGTH)
      .max(MAX_ID_LENGTH)
      .toLowerCase()
      .regex(ID_REGEX, "Invalid data connection ID format")
      .openapi({ example: "data-connection-id" }),
    name: z.string(),
    prefix_template: z.optional(z.string()),
    read_only: z.boolean(),
    allowed_data_modes: z.array(z.nativeEnum(RepositoryDataMode)),
    required_flag: z.optional(z.nativeEnum(AccountFlags)),
    details: DataConnnectionDetailsSchema,
    authentication: z.optional(DataConnectionAuthenticationSchema),
  })
  .openapi("DataConnection");

export type DataConnection = z.infer<typeof DataConnectionSchema>;
