import { StatusCodes } from "http-status-codes";
import { withApiSession, toResponse } from "@/lib/api/handler";
import { bearer, errors, json, registry } from "@/lib/api/openapi";
import {
  AccountSuggestionPageSchema,
  createOrganization,
  CreateOrganizationSchema,
  searchAccounts,
  SearchAccountsQuerySchema,
} from "@/lib/operations/accounts";
import { OrganizationalAccountSchema } from "@/types";

registry.registerPath({
  method: "get",
  path: "/accounts",
  tags: ["Accounts"],
  summary: "Search accounts",
  description:
    "Returns up to 10 active people whose ID or name contains `q`. With `member_of`, it also searches that account's service accounts, if you may invite members to it.\n\nAdmins may search by a whole email address. That finds the one account signed in with it, even a disabled one. Returns 403 to anyone else who searches by email.\n\nReturns 400 if `q` is shorter than two characters.",
  security: bearer,
  request: { query: SearchAccountsQuerySchema },
  responses: {
    200: json("The matching accounts, all on one page.", AccountSuggestionPageSchema),
    ...errors(400, 401, 403),
  },
});

export const GET = withApiSession(async ({ session, request }) =>
  toResponse(
    await searchAccounts(session, Object.fromEntries(request.nextUrl.searchParams)),
    StatusCodes.OK,
    "query"
  )
);

registry.registerPath({
  method: "post",
  path: "/accounts",
  tags: ["Accounts"],
  summary: "Create an organization",
  description:
    "Creates an organization and makes its owner a member with the `owners` role. The owner is you, unless an admin names someone else in `owner_account_id`.\n\nYou may create organizations if an admin has given your account the `create_organizations` flag. People get their accounts when they sign up on the website, and service accounts are created with `POST /accounts/{account_id}/service-accounts`.\n\nReturns 409 if an account already holds the ID.",
  security: bearer,
  request: {
    body: { content: { "application/json": { schema: CreateOrganizationSchema } } },
  },
  responses: {
    201: json("The new organization.", OrganizationalAccountSchema),
    ...errors(400, 401, 403, 409),
  },
});

export const POST = withApiSession(async ({ session, body }) =>
  toResponse(await createOrganization(session, body), StatusCodes.CREATED)
);
