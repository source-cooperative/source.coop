import { z } from "zod";
import { withApiSession, toResponse } from "@/lib/api/handler";
import { bearer, errors, json, registry } from "@/lib/api/openapi";
import { StatusCodes } from "http-status-codes";
import {
  deleteTag,
  DeleteTagQuerySchema,
  TagSchema,
  updateTag,
  UpdateTagSchema,
} from "@/lib/operations/tags";

type Params = { tag_id: string };

const params = z.object({
  tag_id: z.string().openapi({
    description: "The tag, such as `sea-ice`.",
  }),
});

registry.registerPath({
  method: "patch",
  path: "/tags/{tag_id}",
  tags: ["Tags"],
  summary: "Approve a tag",
  description:
    "Approves a tag that awaits review, so everyone may pick it. Only admins may approve tags. Approving a tag that is already approved changes nothing.",
  security: bearer,
  request: {
    params,
    body: { content: { "application/json": { schema: UpdateTagSchema } } },
  },
  responses: {
    200: json("The tag, approved.", TagSchema),
    ...errors(400, 401, 403, 404),
  },
});

export const PATCH = withApiSession<Params>(async ({ session, params, body }) =>
  toResponse(await updateTag(session, params.tag_id, body))
);

registry.registerPath({
  method: "delete",
  path: "/tags/{tag_id}",
  tags: ["Tags"],
  summary: "Reject or merge a tag",
  description:
    "Deletes a tag that awaits review and takes it off every product that carries it. Only admins may delete tags.\n\nWith `?replace_with=`, puts that approved tag on those products in its place. This merges the suggestion into a tag that means the same.\n\nOnly a tag awaiting review can be deleted. Deleting an approved tag returns 409.",
  security: bearer,
  request: { params, query: DeleteTagQuerySchema },
  responses: {
    200: json("The tag as it was before it was deleted.", TagSchema),
    ...errors(400, 401, 403, 404, 409),
  },
});

export const DELETE = withApiSession<Params>(async ({ session, params, request }) =>
  toResponse(
    await deleteTag(
      session,
      params.tag_id,
      Object.fromEntries(request.nextUrl.searchParams)
    ),
    StatusCodes.OK,
    "query"
  )
);
