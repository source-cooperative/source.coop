import { MembershipSchema } from "@/types";
import { withApiSession, toResponse } from "@/lib/api/handler";
import { bearer, errors, json, membershipIdParams, registry } from "@/lib/api/openapi";
import {
  updateMembership,
  UpdateMembershipSchema,
} from "@/lib/operations/memberships";

registry.registerPath({
  method: "patch",
  path: "/memberships/{membership_id}",
  tags: ["Memberships"],
  summary: "Change a member's role",
  description:
    "Changes the role of an active membership. A service account can only hold `read_data` or `write_data`.",
  security: bearer,
  request: {
    params: membershipIdParams,
    body: { content: { "application/json": { schema: UpdateMembershipSchema } } },
  },
  responses: {
    200: json("The membership, as it now stands.", MembershipSchema),
    ...errors(400, 401, 403, 404, 409),
  },
});

export const PATCH = withApiSession<{ membership_id: string }>(
  async ({ session, params, body }) =>
    toResponse(await updateMembership(session, params.membership_id, body))
);
