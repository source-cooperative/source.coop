import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

/**
 * A subject an account trusts to act as it: an issuer, and the exact subject
 * that issuer's tokens carry. The same shape as a statement in an AWS role's
 * trust policy, and used the same way — a workload names the account it wants
 * when it exchanges its token, and the exchange succeeds only if that account
 * trusts the token's subject. A subject may be trusted by any number of
 * accounts; nothing about the subject alone chooses one.
 */
export const AccountTrustSchema = z
  .object({
    account_id: z.string().min(1).openapi({ example: "acme-nightly-sync" }),
    issuer: z.string().min(1).openapi({ example: "https://token.actions.githubusercontent.com" }),
    subject: z.string().min(1).openapi({ example: "repo:acme/data:ref:refs/heads/main" }),
    created_at: z.string().datetime(),
    /** Who added it: the manager's account id. */
    created_by: z.string().min(1),
  })
  .openapi("AccountTrust");

export type AccountTrust = z.infer<typeof AccountTrustSchema>;

