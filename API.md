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

The reference is OpenAPI 3.1, so its schemas are JSON Schema 2020-12 that
validators and code generators can use as they stand: a nullable field is
`type: ["string", "null"]`, not 3.0's `nullable: true`. Move to 3.2 once
Swagger UI, Redoc and zod-to-openapi support it.

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

A create whose resource is named by its own content, so that a second request
can only mean the same thing, answers 200 and the existing resource rather
than 409. Retrying it is then safe without an `Idempotency-Key` (#708).
`POST /tags` is one: suggesting a tag that exists answers that tag.

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

Every error is an [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457) problem,
served as `application/problem+json`:

```json
{
  "type": "https://source.coop/api/problems/invalid",
  "title": "Invalid request",
  "status": 400,
  "detail": "Product ID may not contain consecutive hyphens",
  "instance": "https://source.coop/api/v1/products/example",
  "code": "invalid",
  "errors": [
    { "detail": "Product ID may not contain consecutive hyphens", "pointer": "#/product_id" }
  ],
  "request_id": "iad1::abcde-1234567890"
}
```

| Status | `code` | When |
|---|---|---|
| 400 | `invalid` | the input fails its schema or a rule; `errors` names the fields |
| 401 | `unauthenticated` | no credentials, and the endpoint needs some |
| 403 | `forbidden` | credentials that may not do this |
| 404 | `not_found` | nothing by that ID, or nothing the caller may know of |
| 409 | `conflict` | the resource's state doesn't allow it |
| 500 | `internal` | anything thrown; the detail says nothing more |

The members, and who sets them:

- **`type`** is `/api/problems/{code}` on the host that answered
  (`https://source.coop/api/problems/{code}` in production), so it resolves on
  the deployment that raised it, to a page that explains the problem and what
  to do about it. `/api/problems` lists them all.
- **`title`** and **`status`** come with the type. A title never varies
  between occurrences; anything about this occurrence goes in `detail`.
- **`detail`** is the operation's message: a sentence for a person, which says
  what to do instead where there is something to do.
- **`code`** is the type's last segment. Clients switch on it rather than on
  `type`, whose host differs between deployments.
- **`errors`** lists each problem with a field, for `invalid` only. A body field
  is named by `pointer`, a JSON Pointer as a URI fragment (`#/metadata/title`);
  a query parameter by `parameter`. Operations keep keying `fieldErrors` by
  dotted path, and `toResponse` translates; pass it `"query"` as its third
  argument when the operation was given the query string, so the fields come
  out as parameters.
- **`instance`** (the request's URL, without its query) and **`request_id`**
  (Vercel's `x-vercel-id`, which finds the request in its logs) are added by
  `withProblems`, which also makes `type` absolute and answers anything thrown
  as an `internal` problem. `withApiSession` is built on it, and a route that
  authenticates its caller itself is wrapped in it directly, so every problem
  carries them.

Every 401 also carries `WWW-Authenticate`
([RFC 9110 §11.6.1](https://www.rfc-editor.org/rfc/rfc9110#section-11.6.1)):
`Bearer` when the request sent no bearer token, and
`Bearer error="invalid_token"`
([RFC 6750 §3.1](https://www.rfc-editor.org/rfc/rfc6750#section-3.1)) when it
sent one that was refused, so a client knows to get a new token rather than add
one. `withProblems` sets it from the request, so a route never does. It names no
`resource_metadata` yet: that waits on deciding which service is the API's
authorization server.

Each type is defined once, in `src/lib/api/problems.ts`: its status, title, and
the prose its page publishes. The handler, the reference's `Problem` schema and
the pages all read that table. A new kind of failure is a new entry there, with
an `OperationError` to raise it, not a new status picked in a route.

Answer problems through `toResponse` or `problemResponse(problem(...))` inside
`withProblems`, never by building an error body by hand: a hand-built body misses the media type and the members clients rely
on. A problem may carry an extension member that only
its endpoint answers. Declare it by extending `ProblemSchema`, and document it
with `problemJson` rather than `json`. The data proxy's trust exchange is the
one so far: its 403 is a `forbidden` problem that also says `trusted: false`.

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
  compatible with. The endpoints it calls are listed in its
  `src/source_api/cache.rs`, and the fields it reads in
  `src/source_api/types.rs`. The proxy owns the check that this API still
  serves them: its `tests/test_contract.py` compares them nightly against
  production. A change to the request, statuses or success body of one of
  those endpoints needs the matching data.source.coop change first.
- **The CLI** (source-coop-cli) is built against this API and follows the
  reference as it changes. It reads problems into its own `--json` error
  output, so a change to a problem's members needs the matching CLI change.
- **Everyone else** is unknown. Before removing or reshaping an endpoint, check
  production traffic for it in Vercel's logs for the path; if something still
  calls it, deprecate it instead.
