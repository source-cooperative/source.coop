import { z } from "zod";
import { StatusCodes } from "http-status-codes";
import { MembershipInvitationSchema, MembershipSchema } from "@/types";
import { withApiSession, toResponse } from "@/lib/api/handler";
import { bearer, errors, json, registry } from "@/lib/api/openapi";
import { inviteMember, listMembers } from "@/lib/operations/memberships";

type Params = { account_id: string; repository_id: string };

const params = z.object({
  account_id: z.string().openapi({ description: "The product owner's ID." }),
  repository_id: z.string().openapi({ description: "The product's ID." }),
});

registry.registerPath({
  method: "get",
  path: "/products/{account_id}/{repository_id}/members",
  tags: ["Memberships"],
  summary: "List a product's members",
  description:
    "The memberships of one product, in every state, that the caller may see. Members of the owning organization aren't listed here.",
  security: bearer,
  request: { params },
  responses: {
    200: json("The memberships.", z.array(MembershipSchema)),
    ...errors(401, 403, 404),
  },
});

export const GET = withApiSession<Params>(async ({ session, params }) =>
  toResponse(
    await listMembers(session, {
      account_id: params.account_id,
      product_id: params.repository_id,
    })
  )
);

registry.registerPath({
  method: "post",
  path: "/products/{account_id}/{repository_id}/members",
  tags: ["Memberships"],
  summary: "Invite a member to a product",
  description:
    "Invites a person to a product; they become a member once they accept. A service account owned by the product's owner is granted access at once, with the `read_data` or `write_data` role.",
  security: bearer,
  request: {
    params,
    body: { content: { "application/json": { schema: MembershipInvitationSchema } } },
  },
  responses: {
    201: json("The invitation, or a service account's membership.", MembershipSchema),
    ...errors(400, 401, 403, 404, 409),
  },
});

export const POST = withApiSession<Params>(async ({ session, params, body }) =>
  toResponse(
    await inviteMember(session, {
      ...(body as object),
      membership_account_id: params.account_id,
      repository_id: params.repository_id,
    }),
    StatusCodes.CREATED
  )
);
