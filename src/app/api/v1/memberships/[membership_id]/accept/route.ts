import { MembershipSchema } from "@/types";
import { withApiSession, toResponse } from "@/lib/api/handler";
import { bearer, errors, json, membershipIdParams, registry } from "@/lib/api/openapi";
import { acceptInvitation } from "@/lib/operations/memberships";

registry.registerPath({
  method: "post",
  path: "/memberships/{membership_id}/accept",
  tags: ["Memberships"],
  summary: "Accept an invitation",
  description:
    "Accepts an invitation addressed to the caller, making them a member. Only a pending invitation can be accepted.",
  security: bearer,
  request: { params: membershipIdParams },
  responses: {
    200: json("The membership, as it now stands.", MembershipSchema),
    ...errors(400, 401, 403, 404, 409),
  },
});

export const POST = withApiSession<{ membership_id: string }>(
  async ({ session, params }) =>
    toResponse(await acceptInvitation(session, params.membership_id))
);
