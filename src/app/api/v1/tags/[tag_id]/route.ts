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
  summary: "Approve a tag, or undo a decision",
  description:
    "With `pending: false`, approves a tag that awaits review, so everyone may pick it. Approving a tag that is already approved changes nothing. A merged or rejected tag returns 409 until its decision is undone.\n\nWith `pending: true`, undoes an admin's decision. A suggested tag goes back awaiting review; an approved tag that was merged or removed goes back on the list. Undoing a merge or rejection puts the tag back on each product it was taken off, and takes off the tags a merge added, unless the product had them before. A product saved since then returns 409, with nothing changed.\n\nOnly admins may do either.",
  security: bearer,
  request: {
    params,
    body: { content: { "application/json": { schema: UpdateTagSchema } } },
  },
  responses: {
    200: json("The tag, approved or back awaiting review.", TagSchema),
    ...errors(400, 401, 403, 404, 409),
  },
});

export const PATCH = withApiSession<Params>(async ({ session, params, body }) =>
  toResponse(await updateTag(session, params.tag_id, body))
);

registry.registerPath({
  method: "delete",
  path: "/tags/{tag_id}",
  tags: ["Tags"],
  summary: "Reject, merge or rename a tag",
  description:
    "Rejects a tag that awaits review and takes it off every product that carries it.\n\nWith `?replace_with=`, puts that tag on those products in its place. This merges the tag into a tag that means the same. Repeat `replace_with` to merge into several tags, such as `field` and `boundaries` for `field-boundaries`. A `replace_with` tag that is not on the list is added to it as approved, which renames the tag.\n\nWith `?approved=true`, does the same to an approved tag instead.\n\nThe tag leaves the list but stays on record, with the decision and what it did to each product. `PATCH` with `pending: true` undoes it.\n\nThe tag must be in the state `approved` names, and each product must be unchanged since it was read. Otherwise the request returns 409, with nothing changed. The changes to a tag on about 100 products or more are saved in batches. If a later batch fails, the 409 says how many products changed; undo the decision, then try again.\n\nOnly admins may do this.",
  security: bearer,
  request: { params, query: DeleteTagQuerySchema },
  responses: {
    200: json("The tag, with the decision recorded on it.", TagSchema),
    ...errors(400, 401, 403, 404, 409),
  },
});

export const DELETE = withApiSession<Params>(async ({ session, params, request }) =>
  toResponse(
    await deleteTag(session, params.tag_id, {
      // Every one, which Object.fromEntries would cut to the last.
      replace_with: request.nextUrl.searchParams.getAll("replace_with"),
      approved: request.nextUrl.searchParams.get("approved") ?? undefined,
    }),
    StatusCodes.OK,
    "query"
  )
);
