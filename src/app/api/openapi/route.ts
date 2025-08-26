import { StatusCodes } from "http-status-codes";
import { NextRequest, NextResponse } from "next/server";
// @ts-expect-error: No types for swagger-jsdoc
import swaggerJSDoc from "swagger-jsdoc";
import { OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";
import {
  AccountCreationRequestSchema,
  APIKeyRequestSchema,
  APIKeySchema,
  DataConnectionSchema,
  MembershipInvitationSchema,
  MembershipSchema,
  RedactedAPIKeySchema,
  RepositoryCreationRequestSchema,
  RepositoryMetaSchema,
  RepositorySchema,
  RepositoryUpdateRequestSchema,
  RepositoryListSchema,
  RepositoryFeaturedUpdateRequestSchema,
} from "@/types";
import { AccountSchema } from "@/types/account";

export async function GET(_req: NextRequest) {
  const options = {
    definition: {
      openapi: "3.0.0",
      info: {
        title: "Source Cooperative API",
        version: "1.0.0",
      },
      servers: [
        {
          url: "https://source.coop/api/v1",
          description: "Source Cooperative",
        },
      ],
    },
    apis: ["./src/api/v1/**/*.ts"],
  };

  const openapiSpecification = swaggerJSDoc(options);

  const generator = new OpenApiGeneratorV3([
    AccountSchema,
    MembershipSchema,
    AccountCreationRequestSchema,
    APIKeySchema,
    APIKeyRequestSchema,
    RedactedAPIKeySchema,
    MembershipInvitationSchema,
    DataConnectionSchema,
    RepositoryCreationRequestSchema,
    RepositorySchema,
    RepositoryMetaSchema,
    RepositoryUpdateRequestSchema,
    RepositoryListSchema,
    RepositoryFeaturedUpdateRequestSchema,
  ]);
  if (!openapiSpecification["components"]) {
    openapiSpecification["components"] = {};
  }
  openapiSpecification["components"]["securitySchemes"] = {
    ApiKeyAuth: {
      type: "apiKey",
      in: "header",
      name: "Authorization",
      description: "Follows the format `<access-key-id> <secret-access-key>`",
    },
  };
  openapiSpecification["security"] = [{ ApiKeyAuth: [] }];
  const generatedComponents = generator.generateComponents().components;
  openapiSpecification["components"]["schemas"] =
    generatedComponents?.schemas || {};

  return NextResponse.json(openapiSpecification, { status: StatusCodes.OK });
}
