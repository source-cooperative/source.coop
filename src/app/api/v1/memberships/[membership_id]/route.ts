import { MembershipSchema } from "@/types";
import { withApiSession, toResponse } from "@/lib/api/handler";
import { bearer, errors, json, membershipIdParams, registry } from "@/lib/api/openapi";
import {
  updateMembership,
  UpdateMembershipSchema,
} from "@/lib/operations/memberships";

type Params = { membership_id: string };

registry.registerPath({
  method: "patch",
  path: "/memberships/{membership_id}",
  tags: ["Memberships"],
  summary: "Change a membership",
  description:
    "Changes a membership's `role` or `state`, one per request. Managers change roles and revoke. Members accept, decline or leave.",
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

export const PATCH = withApiSession<Params>(async ({ session, params, body }) =>
  toResponse(await updateMembership(session, params.membership_id, body))
);
