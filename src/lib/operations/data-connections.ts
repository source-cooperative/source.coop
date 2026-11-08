import { isDeepStrictEqual } from "util";
import { z } from "zod";
import {
  Actions,
  DataConnection,
  DataConnectionAuthenticationSchema,
  DataConnectionAuthenticationType,
  DataConnectionDetails,
  DataConnectionObjectSchema,
  DataConnectionSchema,
  DataProvider,
  isSafePrefix,
  MIN_ID_LENGTH,
  resolveMirrorPrefix,
  slugifyToId,
  SUPPORTED_AUTH_TYPES,
  UNSAFE_PREFIX_MESSAGE,
  UserSession,
} from "@/types";
import {
  canCreateProductForAccount,
  canManageAccountDataConnections,
  isAuthorized,
} from "@/lib/api/authz";
import { sanitizeDataConnection } from "@/lib/api/sanitize-data-connection";
import {
  canManageDataConnection,
  canUseDataConnectionFor,
} from "@/lib/data-connections";
import { LOGGER } from "@/lib/logging";
import {
  accountsTable,
  dataConnectionsTable,
  productsTable,
} from "@/lib/clients/database";
import { isConditionalCheckFailed } from "@/lib/clients/database/errors";
import {
  conflict,
  decodeCursor,
  deny,
  encodeCursor,
  forbidden,
  fromZodError,
  invalid,
  notFound,
  ok,
  OperationResult,
  Page,
  PageQuerySchema,
  unauthenticated,
} from "./result";

/** The id is derived from `name` and `owner`, so neither caller nor form sets it. */
export const CreateDataConnectionSchema = DataConnectionObjectSchema.omit({
  data_connection_id: true,
}).openapi("CreateDataConnection");

const UpdateFields = DataConnectionObjectSchema.omit({
  data_connection_id: true,
  owner: true,
}).partial();

/**
 * Top-level fields replace the stored ones; a field left out keeps its stored
 * value, and `null` clears an optional one. `owner` is not here: a connection
 * never changes hands.
 */
export const UpdateDataConnectionSchema = UpdateFields.extend({
  prefix_template: UpdateFields.shape.prefix_template.nullable(),
  required_flag: UpdateFields.shape.required_flag.nullable(),
  // A fresh union of the same variants: zod-to-openapi documents `.nullable()`
  // on the registered `DataConnectionAuthentication` as a `$ref` that still
  // rejects null.
  authentication: z
    .discriminatedUnion("type", DataConnectionAuthenticationSchema.options)
    .nullable()
    .optional(),
}).openapi("UpdateDataConnection");

export const ListDataConnectionsQuerySchema = PageQuerySchema.extend({
  owner: DataConnectionObjectSchema.shape.owner.openapi({
    description:
      "Only the connections this account owns: the management view, open to those who manage the account's connections.",
  }),
  usable_for: z.string().optional().openapi({
    description:
      "Only the connections the caller may create a product on under this account, the platform's own included.",
  }),
  limit: PageQuerySchema.shape.limit.openapi({
    description:
      "At most this many. A page can hold fewer, or none, before the last one. Follow `next_cursor` until it is null.",
  }),
});

const CursorSchema = z.object({ data_connection_id: z.string() }).strict();

function audit(operation: string, session: UserSession, c: DataConnection) {
  LOGGER.info("Data connection changed", {
    operation,
    context: "data-connections",
    metadata: {
      by: session.account?.account_id ?? session.identity_id,
      data_connection_id: c.data_connection_id,
      owner: c.owner,
    },
  });
  return ok(sanitizeDataConnection(c));
}

/**
 * The bucket a connection's details name, with the path of the field that
 * names it. An Azure container is only unique within its storage account.
 * Lowercased because a bucket is reached by hostname, which ignores case, so
 * `A.example` and `a.example` name the same bucket.
 */
const bucketOf = (d: DataConnectionDetails) =>
  d.provider === DataProvider.Azure
    ? {
        path: ["details", "container_name"],
        bucket: `${d.account_name}/${d.container_name}`.toLowerCase(),
      }
    : { path: ["details", "bucket"], bucket: d.bucket.toLowerCase() };

/**
 * The whole connection, checked across fields, as it is about to be written.
 * An owned connection is already confined to its owner's products, so it never
 * carries a platform flag. `stored` is the row an update starts from.
 */
const complete = (c: Record<string, unknown>, stored?: DataConnection) =>
  DataConnectionSchema.superRefine((connection, ctx) => {
    const issue = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: z.ZodIssueCode.custom, path, message });

    // A row that already has an unsupported type may be edited without
    // changing it, so editing its name or visibilities doesn't force a
    // credential change at the same time.
    const type = connection.authentication?.type;
    if (
      type &&
      !SUPPORTED_AUTH_TYPES.includes(type) &&
      type !== stored?.authentication?.type
    ) {
      issue(
        ["authentication", "type"],
        `The data proxy can't sign requests with "${type}". Use a web identity role, or no authentication for a public bucket.`
      );
    }

    // Checked joined as well as apart: "a." and ".b" are each fine, but a
    // product's keys would start with "a..b". The ids substituted here stand
    // in for any real one, which can't hold a "." or "/".
    const base = connection.details.base_prefix;
    const template = connection.prefix_template ?? "";
    if (!isSafePrefix(base)) {
      issue(["details", "base_prefix"], UNSAFE_PREFIX_MESSAGE);
    }
    if (
      !isSafePrefix(template) ||
      !isSafePrefix(base + resolveMirrorPrefix(template, "account", "product"))
    ) {
      issue(["prefix_template"], UNSAFE_PREFIX_MESSAGE);
    }

    // Products already keep objects where an owned connection points, so its
    // owner can't move it to another provider, bucket or kind of credential.
    // A new connection is made for new storage instead.
    if (stored?.owner) {
      if (connection.details.provider !== stored.details.provider) {
        issue(["details", "provider"], "An owned connection's provider can't change");
      } else if (bucketOf(connection.details).bucket !== bucketOf(stored.details).bucket) {
        issue(bucketOf(connection.details).path, "An owned connection's bucket can't change");
      }
      if (type !== stored.authentication?.type) {
        issue(
          ["authentication", "type"],
          "An owned connection's authentication type can't change"
        );
      }
    }
  }).safeParse({
    ...c,
    required_flag: c.owner ? undefined : c.required_flag,
  });

/**
 * The AWS account an IAM role ARN belongs to
 * (`arn:{partition}:iam::{account}:role/{name}`).
 */
const awsAccountOf = (roleArn: string) => roleArn.split(":")[4];

const roleArnOf = (c: DataConnection) =>
  c.authentication?.type === DataConnectionAuthenticationType.S3WebIdentityRole
    ? c.authentication.role_arn
    : undefined;

/**
 * Refuses an owned connection that names the platform's storage: a bucket
 * that one of the platform's own (unowned) connections names, or a role in
 * the same AWS account as one of theirs. The platform's set is read from the
 * table on each write, so it follows the connections admins add.
 *
 * This is a check at write time, not the boundary. The trust policy on each
 * platform role decides which connections may assume it; this only reports a
 * connection that couldn't work when it is saved, rather than when a product
 * on it is first read.
 */
async function namesPlatformStorage(
  c: DataConnection
): Promise<OperationResult<never> | null> {
  if (!c.owner) return null;
  const platform = (await dataConnectionsTable.listAll()).filter((p) => !p.owner);
  const { path, bucket } = bucketOf(c.details);
  if (platform.some((p) => bucketOf(p.details).bucket === bucket)) {
    return invalid(
      "This bucket holds Source Cooperative's own data. Use a bucket of your own.",
      path.join(".")
    );
  }
  const role = roleArnOf(c);
  const accounts = new Set(
    platform.map(roleArnOf).filter((arn) => arn !== undefined).map(awsAccountOf)
  );
  if (role && accounts.has(awsAccountOf(role))) {
    return invalid(
      "This role is in Source Cooperative's own AWS account. Use a role in an AWS account of your own.",
      "authentication.role_arn"
    );
  }
  return null;
}

/**
 * Secrets never leave the database, so a client editing a connection can't
 * send them back: a blank or missing secret keeps the stored one, as long as
 * the authentication type and the storage it points at are unchanged. A
 * credential re-pointed at another bucket or endpoint has to be given again,
 * or whoever edits the connection could aim someone else's key anywhere.
 */
function withStoredSecrets(input: unknown, stored: DataConnection) {
  const given = input as {
    authentication?: Record<string, unknown>;
    details?: unknown;
  } | null;
  const auth = given?.authentication;
  if (
    !auth ||
    auth.type !== stored.authentication?.type ||
    (given.details !== undefined &&
      !isDeepStrictEqual(given.details, stored.details))
  ) {
    return input;
  }
  const fields = Object.entries(auth).filter(([, v]) => v !== "");
  return {
    ...given,
    authentication: { ...stored.authentication, ...Object.fromEntries(fields) },
  };
}

/**
 * What a list shows without `usable_for`: the platform's own connections, and
 * the owned ones the caller manages. An owned connection names its account's
 * buckets, so it isn't for everyone to browse.
 */
async function visible(session: UserSession | null, c: DataConnection) {
  return (
    isAuthorized(session, c, Actions.GetDataConnection) &&
    (!c.owner || (await canManageDataConnection(session, c)))
  );
}

export async function listDataConnections(
  session: UserSession | null,
  query: unknown
): Promise<OperationResult<Page<DataConnection>>> {
  if (!session) return unauthenticated();
  const parsed = ListDataConnectionsQuerySchema.safeParse(query);
  if (!parsed.success) return fromZodError(parsed.error);
  const { owner, usable_for, cursor, limit } = parsed.data;
  const start = cursor ? decodeCursor(cursor, CursorSchema) : undefined;
  if (start === null) return invalid("Invalid cursor", "cursor");

  for (const [id, may, what] of [
    [owner, canManageAccountDataConnections, "manage"],
    [usable_for, canCreateProductForAccount, "create products under"],
  ] as const) {
    if (!id) continue;
    const account = await accountsTable.fetchById(id);
    if (!account) return notFound(`Account ${id} not found`);
    // UseDataConnection judges only the connection, so the account is checked
    // here: otherwise anyone could list an account's buckets by naming it.
    if (!may(session, account)) {
      return deny(session, `You may not ${what} this account's connections`);
    }
  }

  const { connections, lastEvaluatedKey } = await dataConnectionsTable.listPage(
    limit,
    start,
    usable_for ?? owner,
    Boolean(usable_for)
  );
  let items: DataConnection[];
  if (usable_for) {
    items = connections.filter(
      (c) =>
        isAuthorized(session, c, Actions.GetDataConnection) &&
        canUseDataConnectionFor(session, c, usable_for)
    );
  } else if (owner) {
    // The account check above already covers every connection it owns.
    items = connections;
  } else {
    const shown = await Promise.all(connections.map((c) => visible(session, c)));
    items = connections.filter((_, i) => shown[i]);
  }
  // ponytail: filtering after the read can leave a page short of `limit`; the
  // cursor still moves on correctly.
  return ok({
    items: items.filter((c) => !owner || c.owner === owner).map(sanitizeDataConnection),
    next_cursor: encodeCursor(lastEvaluatedKey),
  });
}

/**
 * Every page of {@link listDataConnections}, sorted by provider then name, for
 * the pages that show a whole list.
 */
export async function listAllDataConnections(
  session: UserSession | null,
  query: { owner?: string }
): Promise<OperationResult<DataConnection[]>> {
  const all: DataConnection[] = [];
  let cursor: string | undefined;
  do {
    const result = await listDataConnections(session, { ...query, cursor, limit: 100 });
    if (!result.ok) return result;
    all.push(...result.value.items);
    cursor = result.value.next_cursor ?? undefined;
  } while (cursor);
  return ok(
    all.sort(
      (a, b) =>
        a.details.provider.localeCompare(b.details.provider) ||
        a.name.localeCompare(b.name)
    )
  );
}

/** DynamoDB rejects an empty key outright, so an empty id is simply not found. */
const fetchById = async (data_connection_id: string) =>
  (data_connection_id &&
    (await dataConnectionsTable.fetchById(data_connection_id))) ||
  null;

export async function getDataConnection(
  session: UserSession | null,
  data_connection_id: string
): Promise<OperationResult<DataConnection>> {
  const connection = await fetchById(data_connection_id);
  if (!connection) {
    return notFound(`Data connection ${data_connection_id} not found`);
  }
  if (!isAuthorized(session, connection, Actions.GetDataConnection)) {
    return deny(session, "You may not read this data connection");
  }
  return ok(sanitizeDataConnection(connection));
}

export async function createDataConnection(
  session: UserSession | null,
  input: unknown
): Promise<OperationResult<DataConnection>> {
  if (!session) return unauthenticated();
  const parsed = CreateDataConnectionSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  // The id is permanent — it's in URLs and is the storage key — so it comes
  // from the name rather than a field of its own that could carry a typo.
  const slug = slugifyToId(parsed.data.name);
  if (!slug) {
    return invalid(
      `Name needs at least ${MIN_ID_LENGTH} letters or numbers, so an ID can be made from it.`,
      "name"
    );
  }
  // Namespaced so two accounts can't collide or probe each other's ids.
  // slugifyToId collapses runs of separators, so the only `--` is this one.
  const { owner } = parsed.data;
  const full = complete({
    ...parsed.data,
    data_connection_id: owner ? `${owner}--${slug}` : slug,
  });
  if (!full.success) return fromZodError(full.error);
  if (!(await canManageDataConnection(session, full.data))) {
    return forbidden("You may not create this data connection");
  }
  const refused = await namesPlatformStorage(full.data);
  if (refused) return refused;

  try {
    await dataConnectionsTable.create(full.data);
  } catch (error) {
    if (!isConditionalCheckFailed(error)) throw error;
    const message = `That name is already taken — it would produce the ID "${full.data.data_connection_id}".`;
    return conflict(message, { name: [message] });
  }
  return audit("createDataConnection", session, full.data);
}

/** The connection, once the caller is found to manage it. */
async function fetchManaged(
  session: UserSession | null,
  data_connection_id: string
): Promise<OperationResult<DataConnection>> {
  if (!session) return unauthenticated();
  const connection = await fetchById(data_connection_id);
  if (!connection) {
    return notFound(`Data connection ${data_connection_id} not found`);
  }
  if (!(await canManageDataConnection(session, connection))) {
    return forbidden("You may not manage this data connection");
  }
  return ok(connection);
}

export async function updateDataConnection(
  session: UserSession | null,
  data_connection_id: string,
  input: unknown
): Promise<OperationResult<DataConnection>> {
  const found = await fetchManaged(session, data_connection_id);
  if (!found.ok) return found;
  const existing = found.value;
  const parsed = UpdateDataConnectionSchema.safeParse(
    withStoredSecrets(input, existing)
  );
  if (!parsed.success) return fromZodError(parsed.error);
  // A credential is given for one destination; moving the destination without
  // giving it again would aim the stored key somewhere its owner never chose.
  // A form posting no authentication type sends it as undefined, which clears
  // it like null; only leaving the key out keeps the stored one.
  if (
    !("authentication" in parsed.data) &&
    existing.authentication &&
    parsed.data.details !== undefined &&
    !isDeepStrictEqual(parsed.data.details, existing.details)
  ) {
    return invalid(
      "Give the authentication again to change where this connection points",
      "authentication"
    );
  }
  const changes = Object.fromEntries(
    Object.entries(parsed.data).map(([k, v]) => [k, v ?? undefined])
  );
  const full = complete({ ...existing, ...changes }, existing);
  if (!full.success) return fromZodError(full.error);
  const refused = await namesPlatformStorage(full.data);
  if (refused) return refused;

  try {
    // update() requires the row to still exist, so a concurrent delete isn't
    // undone by this write.
    await dataConnectionsTable.update(full.data);
  } catch (error) {
    if (!isConditionalCheckFailed(error)) throw error;
    return notFound(`Data connection ${data_connection_id} was deleted`);
  }
  return audit("updateDataConnection", session!, full.data);
}

export async function deleteDataConnection(
  session: UserSession | null,
  data_connection_id: string
): Promise<OperationResult<DataConnection>> {
  const found = await fetchManaged(session, data_connection_id);
  if (!found.ok) return found;
  // Deleting would leave these products pointing at nothing.
  const dependents =
    await productsTable.listProductsByConnectionId(data_connection_id);
  if (dependents.length > 0) {
    return conflict(
      `Cannot delete: ${dependents.length} product(s) still use this connection. Remove it from them first.`
    );
  }
  await dataConnectionsTable.delete(data_connection_id);
  return audit("deleteDataConnection", session!, found.value);
}
