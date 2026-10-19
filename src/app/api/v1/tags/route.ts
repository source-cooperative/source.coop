import { withApiSession, toResponse } from "@/lib/api/handler";
import { json, registry } from "@/lib/api/openapi";
import { listTags, TagPageSchema } from "@/lib/operations/tags";

registry.registerPath({
  method: "get",
  path: "/tags",
  tags: ["Tags"],
  summary: "List tags",
  description:
    "Returns every tag a product may carry, with the category it belongs to. The list comes as one page. It needs no credentials.",
  responses: {
    200: json("Every approved tag.", TagPageSchema),
  },
});

export const GET = withApiSession(async () => toResponse(await listTags()));
