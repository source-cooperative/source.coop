import { StatusCodes } from "http-status-codes";
import { withApiSession, toResponse } from "@/lib/api/handler";
import { bearer, errors, json, optionalBearer, registry } from "@/lib/api/openapi";
import { ok, pageSchema } from "@/lib/operations/result";
import {
  listTags,
  ListTagsQuerySchema,
  suggestTag,
  SuggestTagSchema,
  TagSchema,
} from "@/lib/operations/tags";

registry.registerPath({
  method: "get",
  path: "/tags",
  tags: ["Tags"],
  summary: "List tags",
  description:
    "Returns the tags a product may carry, as one page. Anyone may list them.\n\nWith `?pending=true`, returns the tags awaiting review instead. Only admins may list those; everyone else gets 401 or 403.\n\nWith `?tag_id=`, repeated for each tag, returns just the tags named, in any state, with each one's `outcome` and `merged_into`. Anyone may ask, to learn whether a tag is on the list, awaiting review, merged into others or rejected.\n\nAdmins also see who suggested each tag and when, and which admin approved it and when. Tags from the initial import have no suggester or approver.",
  security: optionalBearer,
  request: { query: ListTagsQuerySchema },
  responses: {
    200: json("The tags.", pageSchema("TagPage", TagSchema)),
    ...errors(400, 401, 403),
  },
});

export const GET = withApiSession(async ({ session, request }) =>
  toResponse(
    await listTags(session, {
      ...Object.fromEntries(request.nextUrl.searchParams),
      // Every one, which Object.fromEntries would cut to the last.
      tag_id: request.nextUrl.searchParams.getAll("tag_id").length
        ? request.nextUrl.searchParams.getAll("tag_id")
        : undefined,
    }),
    StatusCodes.OK,
    "query"
  )
);

registry.registerPath({
  method: "post",
  path: "/tags",
  tags: ["Tags"],
  summary: "Suggest a tag",
  description:
    "Adds a tag that awaits review. Your products may carry it from now on, but only people who may edit them see it until an admin approves it.\n\nIf the tag already exists, approved or pending, you get it back with 200 and nothing changes. So you may retry a suggestion safely. A tag an admin merged or rejected returns 409 until that decision is undone; the problem names the tags a merge put in its place.\n\nYou may have at most 5 suggestions awaiting review. A sixth returns 409.",
  security: bearer,
  request: {
    body: { content: { "application/json": { schema: SuggestTagSchema } } },
  },
  responses: {
    201: json("The new tag, awaiting review.", TagSchema),
    200: json("The tag, which already existed.", TagSchema),
    ...errors(400, 401, 409),
  },
});

export const POST = withApiSession(async ({ session, body }) => {
  const result = await suggestTag(session, body);
  if (!result.ok) return toResponse(result);
  const { tag, created } = result.value;
  return toResponse(ok(tag), created ? StatusCodes.CREATED : StatusCodes.OK);
});
