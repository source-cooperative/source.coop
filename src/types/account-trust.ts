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


/** The issuer of GitHub Actions' ambient OIDC tokens. */
export const GITHUB_ACTIONS_ISSUER = "https://token.actions.githubusercontent.com";

/**
 * A GitHub Actions subject pinned to one repository and one ref or one
 * environment: `repo:{owner}/{repo}:ref:{ref}` or
 * `repo:{owner}/{repo}:environment:{name}`. Nothing organization-wide. A ref
 * has no whitespace, by git's rules; an environment name may.
 *
 * The repository is named either the mutable way, `octocat/my-repo`, or the
 * immutable way GitHub mints for repositories created after July 2026 and
 * for any that opted in, `octocat@123456/my-repo@456789` — each name followed
 * by its permanent id, so a recycled name cannot inherit a trust. A token
 * carries one form or the other, never a mix, and a trust must match the form
 * the repository's tokens carry.
 */
export const GITHUB_ACTIONS_SUBJECT_REGEX =
  /^repo:(?:[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+|[A-Za-z0-9_.-]+@\d+\/[A-Za-z0-9_.-]+@\d+):(?:ref:refs\/[^\s:]+|environment:[^:]+)$/;
