# source.coop

Conventions that aren't visible from the code itself. See
[CONTRIBUTING.md](CONTRIBUTING.md) for architecture and the PR process.

## Storybook

Stories are published at [ui.source.coop](https://ui.source.coop). Run it locally
with `npm run storybook`.

Every UI change lands in Storybook in the same PR: a new component gets a
`.stories.tsx`, a changed one gets its stories updated, a removed one gets its
stories removed. A state that can only be reached by clicking through the running
app is a state nobody reviews.

Stories render in a browser bundle, so a component that fetches its own data
can't have one. `ProductSummaryCard` is an `async` server component whose first
act is `await getPageSession()` — cookies and a DynamoDB lookup, neither of which
exists in the browser — so no prop you pass can make it render.

Split such a component in two: the server half keeps the `async`, the session and
the permission checks, and passes plain values down; the presentational half is
an ordinary function of its props, knows nothing about sessions, and is the half
that gets a story. `ProductDoi` is that half of `ProductSummaryCard` — the card
calls `<ProductDoi doi={...} />`, and the story renders `ProductDoi` with any DOI
it likes.

A component that imports a server action needs `sb.mock()` in
`.storybook/preview.tsx`, or its story fails with `__filename is not defined`.

Show responsive behavior by pinning a viewport, never by wrapping a story in a
fixed-width box. A box exactly as wide as the frame has none of the page padding
the real layout has, so it invents overflow the page doesn't have.

The JSDoc above `meta`, and above each story export, is published prose on
ui.source.coop — not a code comment. Write it for a reader.

## Pull requests

A PR that touches the UI links the stories it affects, on that branch's Storybook
deploy:

```
https://source-coop-ui-git-<branch-name-with-dashes>-radiantearth.vercel.app/?path=/story/<story-id>
```

Link the specific stories rather than the root, and include a screenshot of
anything visual — it shows the change in the review itself, and it outlives the
branch deployment, which goes away with the branch. (Branch deployments ask for a
Vercel login; ui.source.coop is public.)

The title and description describe the branch as it stands, not as it stood when
the PR was opened. After pushing to a branch with an open PR, re-read both: if
the approach has moved on, rewrite them; if they still hold, say so rather than
leaving it unsaid. A description is read as the spec, so a stale one sends a
reviewer looking for code that isn't there. Two parts rot first — a Testing
section asserts checks that may predate the current commits, and a title has to
keep earning its Conventional Commits type once the work changes shape.

## Comments

A comment says why the code is the way it is, in the present tense. What it used
to do, what broke, and what a change fixed belong in the commit message and the PR
description — that is where someone goes looking for history, and it stays
accurate there as the code moves on. This matters twice over in story JSDoc, which
is published.
