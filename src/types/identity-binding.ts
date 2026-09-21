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
    issuer: z.string().min(1).openapi({ example: "https://auth.source.coop" }),
    subject: z.string().min(1).openapi({ example: "identity-id" }),
    account_id: z.string().openapi({ example: "account-id" }),
    created_at: z.string().datetime(),
  })
  .openapi("IdentityBinding");

export type IdentityBinding = z.infer<typeof IdentityBindingSchema>;
