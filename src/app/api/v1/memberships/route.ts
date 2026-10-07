import { z } from "zod";
import { MembershipSchema } from "@/types";
import { withApiSession, toResponse } from "@/lib/api/handler";
import { bearer, errors, json, registry } from "@/lib/api/openapi";
import {
  listMemberships,
  ListMembershipsQuerySchema,
} from "@/lib/operations/memberships";

registry.registerPath({
  method: "get",
  path: "/memberships",
  tags: ["Memberships"],
  summary: "List your memberships",
  description:
    "The caller's own memberships and invitations. `?state=invited` lists only the invitations waiting for an answer.",
  security: bearer,
  request: { query: ListMembershipsQuerySchema },
  responses: {
    200: json("The memberships.", z.array(MembershipSchema)),
    ...errors(400, 401),
  },
});

export const GET = withApiSession(async ({ session, request }) =>
  toResponse(
    await listMemberships(
      session,
      Object.fromEntries(request.nextUrl.searchParams)
    )
  )
);
