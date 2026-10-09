import { MembershipSchema } from "@/types";
import { withApiSession, toResponse } from "@/lib/api/handler";
import { bearer, errors, json, membershipIdParams, registry } from "@/lib/api/openapi";
import { revokeMembership } from "@/lib/operations/memberships";

registry.registerPath({
  method: "post",
  path: "/memberships/{membership_id}/revoke",
  tags: ["Memberships"],
  summary: "Revoke a membership",
  description:
    "Ends a membership or withdraws an invitation. Owners and maintainers can revoke the memberships of the account or product they manage, and anyone can revoke their own.",
  security: bearer,
  request: { params: membershipIdParams },
  responses: {
    200: json("The membership, as it now stands.", MembershipSchema),
    ...errors(400, 401, 403, 404, 409),
  },
});

export const POST = withApiSession<{ membership_id: string }>(
  async ({ session, params }) =>
    toResponse(await revokeMembership(session, params.membership_id))
);
