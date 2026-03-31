# Contributing

## Branch Strategy

- **`main`** — the primary branch. All feature work is merged here via pull requests.

## Pull Requests

1. **Create a branch** off `main`.
2. **Make your changes.** CI checks (tests and linting) run on every push.
3. **Open a pull request.** All CI checks must pass to merge. PR titles must follow [Conventional Commits](https://www.conventionalcommits.org/) format (enforced by CI). Allowed types:

   `feat`, `fix`, `docs`, `test`, `ci`, `refactor`, `perf`, `chore`, `revert`

4. **Preview deployments.** Vercel automatically creates preview deployments for PRs from regular contributors. Outside contributions require approval from a regular contributor before a preview is deployed.
5. **Get review and merge** into `main`.

## Deployments

Merging to `main` automatically deploys to [staging.source.coop](https://staging.source.coop).

Production deploys to [source.coop](https://source.coop) trigger when a [GitHub Release](https://github.com/source-cooperative/source.coop/releases) is published. [release-please](https://github.com/googleapis/release-please) automatically maintains a release PR — merging it creates the GitHub Release and triggers the production deploy.

## Architecture

### Infrastructure

AWS infrastructure is managed with [CDK](https://aws.amazon.com/cdk/) in the `deploy/` directory (DynamoDB, S3, CloudFront, IAM). [Vercel](https://vercel.com) hosts the Next.js frontend and API. Each deploy updates both CDK and Vercel in parallel.

CDK is run alongside other deployment workflows via GitHub Actions (see `.github/workflows/`), following the same deployment patterns (with the exception of preview deplyments which are not supported).

> [!WARNING]
> CDK can only apply one DynamoDB index change per deployment. If you need to add multiple indexes, split them across separate deployments.

### Database

DynamoDB is the primary data store. Production runs in `us-west-2`, staging in `us-east-1`. Table clients live in `src/lib/clients/database/` and are the standard way to interact with the database.

### Authentication

Authentication is handled by [Ory](https://www.ory.sh/). In production, auth pages are served from `auth.source.coop` (a legacy artifact kept to avoid users needing to re-register passkeys). In dev, staging, and preview deployments, Ory middleware serves auth pages directly. Ory identities are linked to internal accounts via the `identity_id` field on the accounts DynamoDB table — on login, the Ory session's identity ID is used to look up the corresponding internal account. Session logic lives in `src/lib/api/utils.ts`.

### Authorization

A single file — `src/lib/api/authz.ts` — manages all permission checks via `isAuthorized(session, resource, action)`. It uses pattern matching (`ts-pattern`) to enforce role-based access control. It is important that this file maintain complete test coverage.

### Data Storage

Repository data is served through an S3-compliant data proxy at `data.source.coop`. Individual file previews (maps, tables, images, 3D models, etc.) are rendered in iframes using standalone viewer apps hosted on GitHub Pages. The S3 endpoint is configured via `NEXT_PUBLIC_S3_ENDPOINT`. User assets (profile images, etc.) are stored in a dedicated S3 bucket fronted by CloudFront, configured via `ASSETS_BUCKET` and `ASSETS_DOMAIN` in `src/lib/config.ts`.

## Code Conventions

### Environment Variables

Environment variables should only be accessed directly in `src/lib/config.ts`. Everything else imports from `CONFIG`.

### Logging

Use `LOGGER` from `src/lib/logging.ts` — not `console.log`. Debug logs are suppressed in production.

### Types

All data types are defined in `src/types/` using [Zod](https://zod.dev/) schemas, with TypeScript types inferred via `z.infer`. Zod is also used for server action input validation.

### UI

[Radix UI](https://www.radix-ui.com/) is the component library. Forms use `src/components/core/DynamicForm.tsx` with Next.js server actions.
