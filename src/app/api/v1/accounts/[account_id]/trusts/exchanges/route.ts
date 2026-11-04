import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticateWithOidcToken } from "@/lib/api/oidc";
import { isAdmin } from "@/lib/api/authz";
import { toResponse, withProblems } from "@/lib/api/handler";
import {
  accountParams,
  bearer,
  errors,
  internal,
  json,
  problemJson,
  ProblemSchema,
  registry,
} from "@/lib/api/openapi";
import { Problem, problem, problemResponse } from "@/lib/api/problems";
import { accountTrustsTable } from "@/lib/clients/database";
import { invalid, unauthenticated } from "@/lib/operations/result";

const BodySchema = z.object({
  issuer: z.string().min(1).openapi({ description: "The verified token's `iss`." }),
  subject: z.string().min(1).openapi({ description: "The verified token's `sub`." }),
});

const AnswerSchema = z.object({ trusted: z.boolean() });

// The refusal is a `forbidden` problem that still says `trusted: false`, so
// either half of it is enough to read the answer.
const RefusalSchema = ProblemSchema.extend({ trusted: z.literal(false) }).openapi(
  "TrustRefusal",
  { description: "A `forbidden` problem that also says `trusted: false`." }
);

registry.registerPath({
  method: "post",
  path: "/accounts/{account_id}/trusts/exchanges",
  ...internal,
  summary: "Whether an account trusts a subject to act as it",
  description:
    "Called by the data proxy at `/.sts`, as the account itself, once it has verified a platform IdP's token (GitHub Actions, say) and read the account the caller named in `RoleArn`. Answers the trust-policy half of an assume-role call; the account's memberships decide what the credentials then carry.",
  security: bearer,
  request: {
    params: accountParams,
    body: { content: { "application/json": { schema: BodySchema } } },
  },
  responses: {
    200: json("The account trusts this subject.", AnswerSchema),
    403: problemJson("The account does not trust this subject.", RefusalSchema),
    ...errors(400, 401),
  },
});

type Context = { params: Promise<{ account_id: string }> };

async function exchange(request: NextRequest, { params }: Context) {
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
  if (!trusted) {
    const refusal: Problem & { trusted: false } = {
      ...problem("forbidden", `${account_id} does not trust this subject`),
      trusted: false,
    };
    return problemResponse(refusal);
  }
  return NextResponse.json({ trusted });
}

// It authenticates the proxy's assertion itself, so `withProblems` rather than
// `withApiSession`.
export const POST = withProblems(exchange);
