import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

/**
 * One way an account may authenticate: a subject as named by an issuer, and
 * the account it resolves to. The pair is the key, so a subject binds to one
 * account per issuer and nothing more.
 */
export const IdentityBindingSchema = z
  .object({
    issuer: z.string().min(1).openapi({ example: "https://token.actions.githubusercontent.com" }),
    subject: z.string().min(1).openapi({ example: "repo:acme/data:ref:refs/heads/main" }),
    account_id: z.string().min(1).openapi({ example: "acme-nightly-sync" }),
    created_at: z.string().datetime(),
  })
  .openapi("IdentityBinding");

export type IdentityBinding = z.infer<typeof IdentityBindingSchema>;
