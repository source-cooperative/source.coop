import { z } from "zod";
import { StatusCodes } from "http-status-codes";
import { MembershipInvitationSchema, MembershipSchema } from "@/types";
import { withApiSession, toResponse } from "@/lib/api/handler";
import { bearer, errors, json, registry } from "@/lib/api/openapi";
import { inviteMember, listMembers } from "@/lib/operations/memberships";

type Params = { account_id: string };

const params = z.object({
  account_id: z.string().openapi({ description: "The account's ID." }),
});

registry.registerPath({
  method: "get",
  path: "/accounts/{account_id}/members",
  tags: ["Memberships"],
  summary: "List an account's members",
  description:
    "The memberships of an account, in every state, that the caller may see.",
  security: bearer,
  request: { params },
  responses: {
    200: json("The memberships.", z.array(MembershipSchema)),
    ...errors(401, 403, 404),
  },
});

export const GET = withApiSession<Params>(async ({ session, params }) =>
  toResponse(await listMembers(session, params))
);

registry.registerPath({
  method: "post",
  path: "/accounts/{account_id}/members",
  tags: ["Memberships"],
  summary: "Invite a member to an account",
  description:
    "Invites a person to an organization. They become a member once they accept. A service account can't be a member of an account, only of its owner's products. Organizations can't be members, and service accounts can't have members.",
  security: bearer,
  request: {
    params,
    body: { content: { "application/json": { schema: MembershipInvitationSchema } } },
  },
  responses: {
    201: json("The invitation.", MembershipSchema),
    ...errors(400, 401, 403, 404, 409),
  },
});

export const POST = withApiSession<Params>(async ({ session, params, body }) =>
  toResponse(
    await inviteMember(session, {
      ...(body as object),
      membership_account_id: params.account_id,
      repository_id: undefined,
    }),
    StatusCodes.CREATED
  )
);
