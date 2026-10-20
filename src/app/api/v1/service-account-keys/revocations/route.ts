import { NextRequest, NextResponse } from "next/server";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { revokeLeakedKey } from "@/lib/accounts/service-account-keys";
import { API_KEY_PREFIX, isApiKey } from "@/types";
import { toResponse } from "@/lib/api/handler";
import { errors, registry } from "@/lib/api/openapi";
import { invalid } from "@/lib/operations/result";

// Trimmed first: a key copied out of a file carries its newline.
const BodySchema = z.object({
  key: z
    .string()
    .trim()
    .refine(isApiKey)
    .openapi({
      description: "The API key: `sck_` and 36 more characters, the last six a checksum of the rest.",
    }),
});

registry.registerPath({
  method: "post",
  path: "/service-account-keys/revocations",
  tags: ["Service accounts"],
  summary: "Revoke an API key by presenting it",
  description:
    "Revokes a service account's API key for anyone who holds it, its owner or a stranger who found it where it should not be, without signing in: holding the key is the only proof asked for. The key goes in the body; one in the query string is refused before any lookup, because request URLs are logged. The answer is the same 204 whether the key was live, already revoked or never existed, so this cannot be used to test a key. The data proxy refuses new exchanges of the key within a minute.",
  security: [],
  request: { body: { content: { "application/json": { schema: BodySchema } } } },
  responses: {
    204: { description: "The key, if it exists, is revoked." },
    ...errors(400),
  },
});

export async function POST(request: NextRequest) {
  if (request.nextUrl.search.includes(API_KEY_PREFIX)) {
    return toResponse(invalid("Send the key in the request body, not the URL"));
  }
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return toResponse(invalid("key is required, as an sck_ API key", "key"));
  }
  await revokeLeakedKey(parsed.data.key, "holder");
  return new NextResponse(null, { status: StatusCodes.NO_CONTENT });
}
