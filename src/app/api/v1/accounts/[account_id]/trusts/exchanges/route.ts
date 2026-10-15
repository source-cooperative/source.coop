import { NextRequest, NextResponse } from "next/server";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { authenticateWithOidcToken } from "@/lib/api/oidc";
import { isAdmin } from "@/lib/api/authz";
import { toResponse } from "@/lib/api/handler";
import {
  accountParams,
  bearer,
  errors,
  forDataProxy,
  internal,
  json,
  registry,
} from "@/lib/api/openapi";
import { accountTrustsTable } from "@/lib/clients/database";
import { invalid, unauthenticated } from "@/lib/operations/result";

const BodySchema = z.object({
  issuer: z.string().min(1).openapi({ description: "The verified token's `iss`." }),
  subject: z.string().min(1).openapi({ description: "The verified token's `sub`." }),
});

const AnswerSchema = z.object({ trusted: z.boolean() });

registry.registerPath({
  method: "post",
  path: "/accounts/{account_id}/trusts/exchanges",
  ...internal,
  summary: "Whether an account trusts a subject to act as it",
  ...forDataProxy(
    "Called by the data proxy at `/.sts`, as the account itself, once it has verified a platform IdP's token (GitHub Actions, say) and read the account the caller named in `RoleArn`. Answers the trust-policy half of an assume-role call; the account's memberships decide what the credentials then carry."
  ),
  security: bearer,
  request: {
    params: accountParams,
    body: { content: { "application/json": { schema: BodySchema } } },
  },
  responses: {
    200: json("The account trusts this subject.", AnswerSchema),
    403: json("The account does not trust this subject.", AnswerSchema),
    ...errors(400, 401),
  },
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ account_id: string }> }
) {
  // A read sent as a POST, so it authenticates the proxy's assertion itself:
  // `getApiSession` refuses those for anything but GET and HEAD.
  const session = await authenticateWithOidcToken(
    request.headers.get("authorization"),
    new URL(request.url).origin
  );
  const { account_id } = await params;
  // Only the account itself — the proxy, calling as it — may ask.
  if (!session?.account || (session.account.account_id !== account_id && !isAdmin(session))) {
    return toResponse(unauthenticated());
  }
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return toResponse(invalid("issuer and subject are required"));
  const { issuer, subject } = parsed.data;
  const trusted = await accountTrustsTable.isTrusted(account_id, issuer, subject);
  return NextResponse.json({ trusted }, { status: trusted ? StatusCodes.OK : StatusCodes.FORBIDDEN });
}
