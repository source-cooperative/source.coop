import { z } from "zod";
import { ServiceAccountKeySchema } from "@/types";
import { withApiSession, toResponse } from "@/lib/api/handler";
import { bearer, errors, json, registry } from "@/lib/api/openapi";
import { updateKey, UpdateKeySchema } from "@/lib/operations/service-accounts";

type Params = { account_id: string; key_id: string };

const params = z.object({
  account_id: z.string().openapi({ description: "The service account's ID." }),
  key_id: z.string().openapi({ description: "The key's ID, from its record." }),
});

registry.registerPath({
  method: "patch",
  path: "/accounts/{account_id}/keys/{key_id}",
  tags: ["Service accounts"],
  summary: "Change or revoke an API key",
  description:
    "Changes the key's expiry, revokes the key, or does both. A revoked key stays in the list, and you can't restore it.\n\nYou may change a key if you manage its service account. Otherwise this returns 404.\n\nRevoking a key that is already revoked returns 409.",
  security: bearer,
  request: {
    params,
    body: { content: { "application/json": { schema: UpdateKeySchema } } },
  },
  responses: {
    200: json("The key as changed.", ServiceAccountKeySchema),
    ...errors(400, 401, 404, 409),
  },
});

export const PATCH = withApiSession<Params>(async ({ session, params, body }) =>
  toResponse(await updateKey(session, params.account_id, params.key_id, body))
);
