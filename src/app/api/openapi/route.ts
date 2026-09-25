import { StatusCodes } from "http-status-codes";
import { NextRequest, NextResponse } from "next/server";
import { OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";
import {
  DataConnectionObjectSchema,
  MembershipInvitationSchema,
  MembershipSchema,
  RedactedAPIKeySchema,
} from "@/types";
import { AccountSchema } from "@/types/account";

export async function GET(_req: NextRequest) {
  const generator = new OpenApiGeneratorV3([
    AccountSchema,
    MembershipSchema,
    RedactedAPIKeySchema,
    MembershipInvitationSchema,
    DataConnectionObjectSchema,
  ]);

  const openapiSpecification = {
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
    paths: {},
    components: {
      schemas: generator.generateComponents().components?.schemas || {},
    },
  };

  return NextResponse.json(openapiSpecification, { status: StatusCodes.OK });
}
