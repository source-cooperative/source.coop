#!/usr/bin/env bash
#
# Vercel "Ignored Build Step" for this repo, which backs two Vercel projects:
# the Next.js app and the Storybook published at ui.source.coop. Both are wired
# to the same branches, so every push builds both -- even when the diff cannot
# possibly change one of them. A push touching only `.stories.tsx` rebuilds the
# app; a push touching only `src/app/` rebuilds Storybook.
#
# Exit 0 skips the build, exit 1 runs it (Vercel's convention, and the easy one
# to get backwards). Every branch that cannot prove a build is unnecessary exits
# 1: an unneeded build costs minutes, a wrongly skipped one ships nothing.
#
# Which project we are deciding for comes from VERCEL_IGNORE_SCOPE, set per
# project in Vercel's environment variables. vercel.json is shared by both
# projects, so the scope cannot live there. An unset or unknown scope builds.
set -uo pipefail

# Classify a list of changed paths (stdin) into "<affects_app> <affects_sb>".
# The catch-all is deliberately both: a path nobody thought about is assumed to
# matter to everything, so adding a directory never silently skips its builds.
classify() {
  local f affects_app=0 affects_sb=0
  while IFS= read -r f; do
    [ -n "$f" ] || continue
    case "$f" in
      # Prose, editor and agent config, CI, infrastructure: ships in neither
      # bundle. cdk/deploy drive AWS, not the Vercel builds.
      *.md | docs/* | .github/* | deploy/* | cdk.json | cdk.context.json | \
      .claude/* | .cursor/* | .vscode/* | .beads/*) ;;
      # Tests run in CI, not in either bundle.
      *.test.ts | *.test.tsx | jest.*) ;;
      # Storybook's own inputs. `.mdx` is in .storybook/main.ts's `stories` glob.
      *.stories.ts | *.stories.tsx | *.mdx | .storybook/*) affects_sb=1 ;;
      # Routes, middleware and repo scripts: no story imports them (stories
      # import components and lib only), so Storybook cannot be affected.
      src/app/* | src/middleware.ts | scripts/*) affects_app=1 ;;
      # Components, lib, styles, public/ (Storybook's staticDirs), lockfile,
      # tsconfig, next.config -- and anything unrecognised.
      *) affects_app=1 affects_sb=1 ;;
    esac
  done
  echo "$affects_app $affects_sb"
}

# Exit code for a scope given the two flags.
decide() {
  case "$1" in
    app) [ "$2" = 0 ] && return 0 || return 1 ;;
    storybook) [ "$3" = 0 ] && return 0 || return 1 ;;
    *) return 1 ;;
  esac
}

self_test() {
  local fails=0
  check() { # <desc> <scope> <expected 0|1> <files...>
    local desc=$1 scope=$2 want=$3
    shift 3
    local flags got
    flags=$(printf '%s\n' "$@" | classify)
    # shellcheck disable=SC2086
    decide "$scope" $flags && got=0 || got=1
    if [ "$got" != "$want" ]; then
      echo "FAIL [$scope] $desc: want $want got $got (flags: $flags)" >&2
      fails=$((fails + 1))
    fi
  }

  # The case that started this: story-only pushes rebuilding the app (#521,
  # #534 and #536 each did).
  check "story-only skips app" app 0 \
    src/components/core/Field.stories.tsx .storybook/preview.tsx
  check "story-only builds storybook" storybook 1 \
    src/components/core/Field.stories.tsx .storybook/preview.tsx

  check "route-only builds app" app 1 "src/app/(app)/feed.xml/route.ts"
  check "route-only skips storybook" storybook 0 "src/app/(app)/feed.xml/route.ts"

  # A component edit arrives with its story; both bundles change.
  check "component+story builds app" app 1 \
    src/components/core/Field.tsx src/components/core/Field.stories.tsx
  check "component+story builds storybook" storybook 1 \
    src/components/core/Field.tsx src/components/core/Field.stories.tsx

  check "docs-only skips app" app 0 README.md docs/using-source/x.md
  check "docs-only skips storybook" storybook 0 README.md docs/using-source/x.md

  check "lockfile builds app" app 1 package-lock.json
  check "lockfile builds storybook" storybook 1 package-lock.json

  # public/ is Storybook's staticDirs as well as the app's.
  check "public asset builds both" storybook 1 public/img/clouds.webp

  # Fail-safe: an unrecognised path, and an unknown scope, both build.
  check "unknown path builds app" app 1 some/new/dir/thing.ts
  check "unknown scope builds" mystery 1 README.md

  [ "$fails" = 0 ] && echo "vercel-ignore-build: all checks passed"
  return "$fails"
}

[ "${1:-}" = "--self-test" ] && { self_test; exit $?; }

scope=${VERCEL_IGNORE_SCOPE:-}
case "$scope" in
  app | storybook) ;;
  *)
    echo "VERCEL_IGNORE_SCOPE is '${scope:-unset}', not app|storybook - building."
    exit 1
    ;;
esac

# Skip only against this project's last successfully deployed commit. That is
# the one base that stays correct for a multi-commit push: Vercel builds only
# the head commit of a push, so `HEAD^` -- the obvious fallback, and the one
# Vercel's own docs reach for -- looks at the final commit alone and will skip a
# build whose earlier commits did change the bundle, leaving a stale preview on
# the PR. VERCEL_GIT_PREVIOUS_SHA is empty on a branch's first deploy, and
# Vercel clones at --depth=10 so an older one can be missing from the clone.
# Either way we build, which is exactly what happens today.
base=${VERCEL_GIT_PREVIOUS_SHA:-}
if [ -z "$base" ] || ! git rev-parse --verify --quiet "${base}^{commit}" >/dev/null; then
  echo "No verifiable previous deployment SHA - building."
  exit 1
fi

files=$(git diff --name-only "$base" HEAD)
if [ -z "$files" ]; then
  echo "Empty diff against $base (redeploy of the same commit?) - building."
  exit 1
fi

flags=$(printf '%s\n' "$files" | classify)
# shellcheck disable=SC2086
if decide "$scope" $flags; then
  echo "No $scope-relevant changes since $base - skipping build."
  # shellcheck disable=SC2001 # per-line indent; the parameter form is unreadable
  echo "$files" | sed 's/^/  /'
  exit 0
fi
echo "$scope-relevant changes since $base - building."
exit 1
