// @ts-nocheck

import { StatusCodes } from "http-status-codes";
import type { NextApiRequest, NextApiResponse } from "next";
import swaggerJSDoc from "swagger-jsdoc";
import { OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";
import {
  AccountCreationRequestSchema,
  AccountSchema,
  APIKeyRequestSchema,
  APIKeySchema,
  DataConnectionSchema,
  MembershipInvitationSchema,
  MembershipSchema,
  RedactedAPIKeySchema,
  RepositoryCreationRequestSchema,
  RepositoryMetaSchema,
  RepositorySchema,
  UserSessionSchema,
  RepositoryUpdateRequestSchema,
  RepositoryListSchema,
  RepositoryFeaturedUpdateRequestSchema,
} from "@/api/types";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
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
    apis: ["./src/pages/api/v1/**/*.ts"],
  };

  var openapiSpecification = swaggerJSDoc(options);

  const generator = new OpenApiGeneratorV3([
    UserSessionSchema,
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
  openapiSpecification["components"] = {
    securitySchemes: {
      ApiKeyAuth: {
        type: "apiKey",
        in: "header",
        name: "Authorization",
        description: "Follows the format `<access-key-id> <secret-access-key>`",
      },
    },
  };
  openapiSpecification["security"] = [{ ApiKeyAuth: [] }];

  openapiSpecification["components"]["schemas"] =
    generator.generateComponents().components.schemas;

  return res.status(StatusCodes.OK).json(openapiSpecification);
}
