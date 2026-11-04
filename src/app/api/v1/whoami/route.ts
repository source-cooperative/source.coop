import { withApiSession, toResponse } from "@/lib/api/handler";
import { bearer, errors, json, registry } from "@/lib/api/openapi";
import { whoami, WhoamiSchema } from "@/lib/operations/accounts";

registry.registerPath({
  method: "get",
  path: "/whoami",
  tags: ["Accounts"],
  summary: "Who you are",
  description:
    "The account the credentials act as and its memberships. Someone signed in who hasn't created an account yet has no `account`.",
  security: bearer,
  responses: {
    200: json("The caller.", WhoamiSchema),
    ...errors(401),
  },
});

export const GET = withApiSession(async ({ session }) => toResponse(whoami(session)));
