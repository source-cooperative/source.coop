# Running source.coop on Cloudflare

The app is a Next.js app built for Workers with
[OpenNext](https://opennext.js.org/cloudflare) (`open-next.config.ts`,
`wrangler.toml`). Storybook is a static Worker (`wrangler.storybook.toml`). AWS
(DynamoDB, assets bucket) stays where it is, managed by CDK.

Cloudflare's git integration ([Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/))
builds and deploys everything except production:

| Worker | wrangler env | Built by | Hostname |
| --- | --- | --- | --- |
| `source-coop-cf` | `cf` | Workers Builds | cf.source.coop (trial, beside the live site) |
| `source-coop-staging` | `staging` | Workers Builds, on push to `main` | staging.source.coop |
| `source-coop-production` | `production` | GitHub Actions, on release (`prod-deploy.yaml`, after CDK) | source.coop |
| `source-coop-ui` | none (`wrangler.storybook.toml`) | Workers Builds, on push to `main` | ui.source.coop |

Production isn't a Workers Builds project because Workers Builds triggers on
branch pushes, not releases, and can't wait for CDK.

## One-time setup

1. **Cloudflare.** The `source.coop` zone must be in the account (custom
   domains need it). Workers need a paid plan for the bundle size and for build
   concurrency (6 builds on paid, 1 on free; 6,000 build minutes a month on
   paid, 3,000 on free; every PR push runs a full OpenNext build).
2. **R2 cache bucket** per Worker: `npx wrangler r2 bucket create source-coop-cf-next-cache`
   (`-staging-`, `-production-` for the others).
3. **AWS identity.** Workers can't present an OIDC token to AWS, so each stage
   uses an IAM user, `SourceFrontend-CloudflareRuntime-<stage>`, created by CDK
   with the DynamoDB and assets-bucket grants the Vercel role had. After
   `cdk deploy`, create its key outside CloudFormation:
   `aws iam create-access-key --user-name SourceFrontend-CloudflareRuntime-dev`.
4. **Worker secrets**, once per Worker (they persist across deploys):
   ```sh
   for s in AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY ORY_PROJECT_API_KEY \
            ORY_OAUTH2_CLIENT_SECRET PROXY_CREDS_COOKIE_KEY CF_ANALYTICS_API_TOKEN; do
     npx wrangler secret put $s --env cf
   done
   ```
   Runtime variables (the non-secret values in `.env.example`: `STAGE`,
   `AWS_REGION`, `NEXT_PUBLIC_S3_ENDPOINT`, `ASSETS_BUCKET`, ...) go in the
   Worker's **Settings → Variables & Secrets**; `keep_vars` stops deploys from
   removing them.
5. **Ory.** Add the Worker's hostnames (`https://cf.source.coop`, and previews'
   `*.workers.dev` hosts you want to log in on) to the project's allowed return
   URLs, CORS origins and the OAuth2 client's redirect URIs
   (`/api/internal/oauth2/callback`), or login won't work there.

## Connecting a Worker to Workers Builds

Dashboard → Workers & Pages → create the Worker from the GitHub repo
(`source-cooperative/source.coop`), then Settings → Builds:

| Setting | `source-coop-cf` | `source-coop-staging` |
| --- | --- | --- |
| Production branch | `main` (set it to the branch under test to trial one) | `main` |
| Build command | `npx opennextjs-cloudflare build` | same |
| Deploy command | `npx opennextjs-cloudflare deploy --env cf` | `... deploy --env staging` |
| Preview builds | on | off, until cutover |
| Preview command | `npx opennextjs-cloudflare upload --env cf` | |

Build variables and secrets (build-only, not visible at runtime): the
`NEXT_PUBLIC_*` values, which Next inlines at build time, `ASSETS_BUCKET`,
`ASSETS_DOMAIN`, `AWS_REGION`, `STAGE`, and `AWS_ACCESS_KEY_ID` /
`AWS_SECRET_ACCESS_KEY` (Next prerenders the landing page against DynamoDB
during the build). Workers Builds reads the Wrangler version from
`package.json`, and Wrangler needs Node 22.12 or later (`.nvmrc`).

Storybook (`source-coop-ui`): build command `npm run build-storybook`, deploy
command `npx wrangler deploy -c wrangler.storybook.toml`, preview command
`npx wrangler versions upload -c wrangler.storybook.toml`.

For production, set the GitHub `Production` environment's secrets
`CLOUDFLARE_API_TOKEN`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` and its
variables `CLOUDFLARE_ACCOUNT_ID`, `AWS_REGION`, `ASSETS_*` and `NEXT_PUBLIC_*`.

## Previewing

- **cf.source.coop.** Push to the `cf` Worker's production branch. To try this
  PR, point that branch setting at the PR's branch. Run it against staging data
  (`STAGE=dev`, staging DynamoDB and data proxy) while it is a trial.
- **Every PR.** With preview builds on, a push to any other branch uploads a
  preview version and Cloudflare comments the URL on the PR. Preview URLs are
  opt-in per Worker (`preview_urls = true` in `wrangler.toml`).
- **Locally in workerd.** Copy `.env.example` to `.dev.vars`, then
  `npm run cf:preview`.

Unverified: the preview command runs `opennextjs-cloudflare upload` (a Worker
version and Version URL, not a Worker Preview). Check that the PR comment shows
the URL; if it says "No Preview URL", the docs' fix is a `wrangler preview`
command.

## Cutover

Connecting the staging Worker and merging takes over staging.source.coop's DNS,
and the next release takes over source.coop. So: prove `cf.source.coop` first,
then connect staging and turn preview builds on there (and off on `cf`), then
release. Delete the Vercel projects afterwards.

## Known limits

- **Long-lived AWS key.** The IAM user's key is the one standing credential.
  Upgrade path: the Worker signs a short-lived OIDC JWT, AWS trusts it through
  an IAM OIDC provider and `AssumeRoleWithWebIdentity` (what Vercel did),
  reusing the platform's JWT-signing keys (ADR-013).
- **No CDK ordering for staging.** Workers Builds doesn't wait for the CDK job,
  so a change that needs new IAM grants or tables can deploy before them.
  Production waits (`needs: deploy-cdk`).
- **`revalidatePath`/`revalidateTag` don't purge, and the queue is missing.**
  The cache is R2 behind the regional cache (`open-next.config.ts`), with no tag
  cache or queue, so the ten or so `revalidatePath` calls after mutations don't
  refresh cached pages and time-based revalidation isn't deduplicated.
  [OpenNext's caching guide](https://opennext.js.org/cloudflare/caching)
  recommends `doQueue` plus `d1NextTagCache` (or `doShardedTagCache` at high
  traffic), each with its own binding in `wrangler.toml` per environment, and a
  D1 database for the tag cache. Follow-up.
- **Regional cache needs a route.** The Cache API does nothing on `*.workers.dev`,
  so it only speeds up cf.source.coop and the real hostnames, not preview URLs.
- **Bundle size.** The Worker must fit Cloudflare's size limit (10 MiB
  compressed on the paid plan). Check the `cf:build` output when dependencies
  grow.
- **Tracing.** `@vercel/otel` is removed; Workers Observability is on, with no
  trace propagation to the data proxy.
