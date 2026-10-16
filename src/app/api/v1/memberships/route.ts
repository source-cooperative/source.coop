import { StatusCodes } from "http-status-codes";
import { MembershipSchema } from "@/types";
import { withApiSession, toResponse } from "@/lib/api/handler";
import { bearer, errors, json, optionalBearer, registry } from "@/lib/api/openapi";
import {
  inviteMember,
  InviteMemberSchema,
  listMemberships,
  ListMembershipsQuerySchema,
  MembershipPageSchema,
} from "@/lib/operations/memberships";

registry.registerPath({
  method: "get",
  path: "/memberships",
  tags: ["Memberships"],
  summary: "List memberships",
  description:
    "Lists the memberships of a `member`, an `account`, or a `product` of an account. Anyone sees active memberships. Invitations are visible to the invitee and the account's managers.",
  security: optionalBearer,
  request: { query: ListMembershipsQuerySchema },
  responses: {
    200: json("The memberships, all on one page for now.", MembershipPageSchema),
    ...errors(400, 401, 403, 404),
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

registry.registerPath({
  method: "post",
  path: "/memberships",
  tags: ["Memberships"],
  summary: "Invite a member",
  description:
    "Invites an account to an account or, with `repository_id`, to one of its products. A person becomes a member after accepting. A service account becomes a member at once. It can only join its owner's products, as `read_data` or `write_data`. Organizations can't be members.",
  security: bearer,
  request: {
    body: { content: { "application/json": { schema: InviteMemberSchema } } },
  },
  responses: {
    201: json("The invitation, or a service account's membership.", MembershipSchema),
    ...errors(400, 401, 403, 404, 409),
  },
});

export const POST = withApiSession(async ({ session, body }) =>
  toResponse(await inviteMember(session, body), StatusCodes.CREATED)
);
