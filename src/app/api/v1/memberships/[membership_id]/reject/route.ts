import { MembershipSchema } from "@/types";
import { withApiSession, toResponse } from "@/lib/api/handler";
import { bearer, errors, json, membershipIdParams, registry } from "@/lib/api/openapi";
import { rejectInvitation } from "@/lib/operations/memberships";

registry.registerPath({
  method: "post",
  path: "/memberships/{membership_id}/reject",
  tags: ["Memberships"],
  summary: "Reject an invitation",
  description:
    "Declines an invitation addressed to the caller. Only a pending invitation can be rejected.",
  security: bearer,
  request: { params: membershipIdParams },
  responses: {
    200: json("The membership, as it now stands.", MembershipSchema),
    ...errors(400, 401, 403, 404, 409),
  },
});

export const POST = withApiSession<{ membership_id: string }>(
  async ({ session, params }) =>
    toResponse(await rejectInvitation(session, params.membership_id))
);
