# Running source.coop on Cloudflare

The app is a Next.js app built for Workers with
[OpenNext](https://opennext.js.org/cloudflare) (`open-next.config.ts`,
`wrangler.jsonc`). Storybook is a static Worker (`wrangler.storybook.jsonc`).
AWS (DynamoDB, assets bucket) stays where it is, managed by CDK.

| wrangler env | Worker | URL |
| --- | --- | --- |
| `cf` | `source-coop-cf` | cf.source.coop (trial, beside the live site) |
| `staging` | `source-coop-staging` | staging.source.coop |
| `production` | `source-coop-production` | source.coop |

## One-time setup (per environment)

1. **Cloudflare.** The `source.coop` zone must be in the account (custom
   domains need it). Create an API token with Workers Scripts, Workers Routes,
   R2 and Zone DNS edit rights.
2. **R2 cache bucket.** `npx wrangler r2 bucket create source-coop-cf-next-cache`
   (`-staging-` / `-production-` for the others).
3. **AWS identity.** Workers can't present an OIDC token to AWS, so the Worker
   uses an IAM user, `SourceFrontend-CloudflareRuntime-<stage>`, created by CDK
   with the same DynamoDB and assets-bucket grants the Vercel role had. After
   `cdk deploy`, create its key outside CloudFormation:
   `aws iam create-access-key --user-name SourceFrontend-CloudflareRuntime-dev`.
4. **Worker secrets**, once per Worker (they persist across deploys):
   ```sh
   for s in AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY ORY_PROJECT_API_KEY \
            ORY_OAUTH2_CLIENT_SECRET PROXY_CREDS_COOKIE_KEY CF_ANALYTICS_API_TOKEN; do
     npx wrangler secret put $s --env cf
   done
   ```
5. **GitHub environments** `CF`, `Staging`, `Production`, `UI`. Secrets:
   `CLOUDFLARE_API_TOKEN`, plus `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` on
   the app environments (the build prerenders the landing page against
   DynamoDB). Variables: `CLOUDFLARE_ACCOUNT_ID` and the app variables listed in
   `.github/workflows/cloudflare-app.yaml` (`STAGE`, `AWS_REGION`,
   `NEXT_PUBLIC_S3_ENDPOINT`, `NEXT_PUBLIC_ORY_SDK_URL`, ...). Repository
   variable `WORKERS_SUBDOMAIN` is your `*.workers.dev` account subdomain.
6. **Ory.** Add `https://cf.source.coop` to the project's allowed return URLs,
   CORS origins and the OAuth2 client's redirect URIs
   (`/api/internal/oauth2/callback`), or login won't work there.

## Previewing

- **cf.source.coop.** Actions → "Deploy to Cloudflare (manual)" → `cf`, or
  locally with the secrets in `.env` and `CLOUDFLARE_API_TOKEN` set:
  `npm run cf:deploy -- --env cf`. Point it at staging data (`STAGE=dev`,
  staging DynamoDB and `NEXT_PUBLIC_S3_ENDPOINT`) while it is a trial.
- **Every PR.** `cloudflare-preview.yaml` uploads the PR as a preview version
  of the `cf` Worker (not promoted) and comments
  `https://pr-<n>-source-coop-cf.<subdomain>.workers.dev` plus the Storybook
  equivalent. Fork PRs get none.
- **Locally in workerd.** Copy `.env.example` to `.dev.vars`, then
  `npm run cf:preview`.

## Cutover

Merging deploys `staging` on push to `main` and `production` on release, and a
Worker custom domain takes over that hostname's DNS. So the order is: prove
`cf.source.coop`, then merge; the first deploy moves staging, the next release
moves production. Delete the Vercel projects afterwards.

## Known limits

- **Long-lived AWS key.** The IAM user's key is the one standing credential.
  Upgrade path: the Worker signs a short-lived OIDC JWT, AWS trusts it through
  an IAM OIDC provider and `AssumeRoleWithWebIdentity` (what Vercel did),
  reusing the platform's JWT-signing keys (ADR-013).
- **`revalidatePath` doesn't purge.** Only an R2 incremental cache is
  configured; `unstable_cache` TTLs work. Add a tag cache if an action needs
  on-demand invalidation to show immediately.
- **Bundle size.** The Worker must fit Cloudflare's size limit (10 MiB
  compressed on the paid plan). Check `npm run cf:build` output when
  dependencies grow.
- **Tracing.** `@vercel/otel` is removed; Workers Observability is on, with no
  trace propagation to the data proxy.
