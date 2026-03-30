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
