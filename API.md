# API conventions

How an endpoint under `/api/v1` is built, documented and kept compatible. The
reference at [`/api/docs`](https://source.coop/api/docs) is generated from the
code, so following these is also how it stays true.

## One operation, thin adapters

Each thing the API does is an **operation** in `src/lib/operations/`: a function
of the session and the input that parses, applies the business rules, checks
authorization and answers an `OperationResult` (`ok(value)`, or `invalid`,
`unauthenticated`, `forbidden`, `notFound`, `conflict`). It decides everything
about whether something may happen.

Everything else only adapts it:

- **A route** in `src/app/api/v1/` wraps its handler in `withApiSession` and
  answers `toResponse(await operation(...))`. It never reads a table or calls
  `isAuthorized` itself.
- **A server action** in `src/lib/actions/` maps form fields to the operation's
  input and answers `toFormState(result, ...)`.
- **A page** under `src/app/(app)/` reads the records it renders through an
  operation too. A page that reads a table itself can show what the API hides.

So the web app and the API can't disagree about a rule, and an operation is
tested once, in `src/lib/operations/*.test.ts`. Adapter tests only check the
mapping.

The exceptions are routes no session can call: the data proxy's exchanges,
which verify the proxy's own assertion; GitHub's secret-scanning callback,
which verifies GitHub's signature; and `POST /service-account-keys/revocations`,
where holding the key is the proof. They do their own authentication.

## Documented where it's defined

Every route registers itself with `registry.registerPath` right above its
handler, using the same Zod schemas the operation parses, so the reference
can't describe a body the code doesn't accept. Import the route module in
`src/app/api/openapi/route.ts`; `route-coverage.test.ts` fails for any handler
exported as `export const|function METHOD` that isn't in the document, other
than those on its `UNREGISTERED` list.

- **`summary` and `description` are published.** Write them for someone
  calling the endpoint: who may, what it answers, and what each status means.
  Write them the way a reference manual reads, not as compressed prose. These
  rules are borrowed from ASD-STE100 (Simplified Technical English), without its
  controlled vocabulary:
  - Lead with what the endpoint returns or does, in a full sentence with a
    verb ("Returns the full account record…").
  - Don't drop words. "A person their own, an admin any" makes the reader
    supply the missing verb; write "People may read their own record, and
    admins may read any."
  - One rule per sentence. When the answer branches by caller or by state, put
    each case in its own sentence, or its own paragraph for a status code,
    rather than chaining them with colons and semicolons.
  - Name who gets what, actively: "Returns 404 for a service account unless
    you manage it", not "a service account is not found by whoever does not
    manage it".
  - Keep each sentence to 25 words or fewer.
  - Address the caller as "you".
- **Declare every method you serve.** Next answers `HEAD` from `GET` when no
  `HEAD` is exported; export `HEAD` as its own `export const HEAD = ...` so
  the coverage test and the reference both see it (`export { GET as HEAD }`
  slips past the test).
- **`security: bearer`** when the endpoint needs credentials, and
  **`optionalBearer`** when it answers anyone but answers differently with them.
- **`...internal`** marks an endpoint only Source's own services or a partner
  call. It is listed under the **Internal** tag, last on the page, and flagged
  `x-internal`.
- **`deprecated: true`**, with a description naming the replacement, for an
  endpoint kept only for the clients that still call it.

## Resources and methods

URLs name resources with plural nouns and snake_case path parameters:
`/accounts/{account_id}`, `/products/{account_id}/{product_id}`. Bodies and
responses use the same snake_case field names as the stored records, except
where a stored name predates the API's: a membership's `product_id` is stored
as `repository_id`, and its table module (`fromItem`/`toItem`) translates
between the two, so nothing above it sees the stored name.

| Method | Means | Answers |
|---|---|---|
| `GET` | read | the resource, or a page of them |
| `HEAD` | does it exist | 200 or 404, no body. Usually `GET`'s access, but its description says who may ask: `HEAD /accounts/{id}` answers anyone, for checking an ID is taken |
| `POST` on a collection | create | 201 and the new resource |
| `POST` on a named action | do something that isn't an edit (`/service-account-keys/revocations`) | the resource as it now is, or 204 |
| `PATCH` | change the fields given, leave the rest; `""` clears a clearable field | the resource as edited |
| `PUT` | replace a whole resource at once (no endpoint uses it yet) | the resource as set |
| `DELETE` | delete | the resource as it was |

Deactivating is not deleting: it is `PATCH { "disabled": true }`, for products
and accounts alike. A `DELETE` that can't delete answers 409 and says what to
do instead.

One resource is edited through one endpoint, even when its fields need
different permissions; check each permission against the fields actually sent.

## Lists

A list answers a page: `{ "items": [...], "next_cursor": "..." | null }`. A
client passes `next_cursor` back as `?cursor=` until it is null, with `?limit=`
from 1 to 100 (default 20).

A list small enough to read whole still answers a page, as its only one
(`onePage(items)`, schema `pageSchema("ThingPage", ThingSchema)`), and takes no
`cursor` or `limit` yet. Never answer a bare array: it can't grow a cursor
later without breaking whoever reads it.

A query parameter that filters a list on a field takes that field's name,
with the field's own validation (`Schema.pick({...}).partial()`):
`/memberships` takes `?account_id=`, `?membership_account_id=` and
`?product_id=`. A parameter that isn't a field, such as `q` or `cursor`, is
named for what it does. A list that can only be read through one of its table's indexes answers
400 to a request that names none, rather than scanning the table.

## Errors

Every error from `toResponse` or `withApiSession` is
`{ "error": { "code", "message", "field_errors"? } }`:

| Status | `code` | When |
|---|---|---|
| 400 | `invalid` | the input fails its schema or a rule; `field_errors` names the fields |
| 401 | `unauthenticated` | no credentials, and the endpoint needs some |
| 403 | `forbidden` | credentials that may not do this |
| 404 | `not_found` | nothing by that ID, or nothing the caller may know of |
| 409 | `conflict` | the resource's state doesn't allow it |
| 500 | `internal` | anything thrown; the message says nothing more |

The data proxy's trust exchange is the exception: it answers 403 as
`{ "trusted": false }`, which the proxy reads.

Refuse with `deny(session, message)`, which picks 401 or 403 for you. Where
the permission doesn't depend on the input, authorize before validating it, so
a caller who may not act learns nothing from its validation errors; where it
does, as for `createProduct` and `inviteMember`, parse first. `withApiSession`
rejects malformed JSON with 400 before any operation runs. Answer 404 rather
than 403 for a thing the caller may not know exists, such as a deactivated
product.

## Writes

Write only the fields the request changes; writing back a whole record read a
moment ago can undo a change someone else made in between.
`accountsTable.update` always writes `name` and `type`, and writes
`metadata_public` and `metadata_private` whole, so it can't make a partial
edit of those.

## Compatibility

- **The data proxy** (data.source.coop) is the consumer the API has to stay
  compatible with. `src/app/api/openapi/data-proxy-contract.test.ts` snapshots
  the request, statuses and success body of every endpoint it calls; a change
  there needs the matching data.source.coop change first.
- **The CLI** (source-coop-cli) is built against this API and follows the
  reference as it changes.
- **Everyone else** is unknown. Before removing or reshaping an endpoint, check
  production traffic for it in Vercel's logs for the path; if something still
  calls it, deprecate it instead.
