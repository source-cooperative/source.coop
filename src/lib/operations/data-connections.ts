import { isDeepStrictEqual } from "util";
import { z } from "zod";
import {
  Actions,
  DataConnection,
  DataConnectionObjectSchema,
  DataConnectionSchema,
  MIN_ID_LENGTH,
  slugifyToId,
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
  listUsableDataConnections,
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
  deny,
  forbidden,
  fromZodError,
  invalid,
  notFound,
  ok,
  onePage,
  OperationResult,
  Page,
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
  authentication: UpdateFields.shape.authentication.nullable(),
}).openapi("UpdateDataConnection");

export const ListDataConnectionsQuerySchema = z.object({
  owner: DataConnectionObjectSchema.shape.owner.openapi({
    description:
      "Only the connections this account owns: the management view, open to those who manage the account's connections.",
  }),
  usable_for: z.string().optional().openapi({
    description:
      "Only the connections the caller may create a product on under this account, the platform's own included.",
  }),
});

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
  const parsed = ListDataConnectionsQuerySchema.safeParse(query);
  if (!parsed.success) return fromZodError(parsed.error);
  const { owner, usable_for } = parsed.data;

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

  let connections: DataConnection[];
  if (usable_for) {
    connections = await listUsableDataConnections(session, [usable_for]);
  } else if (owner) {
    // The account check above already covers every connection it owns.
    connections = await dataConnectionsTable.listAll();
  } else {
    const all = await dataConnectionsTable.listAll();
    const shown = await Promise.all(all.map((c) => visible(session, c)));
    connections = all.filter((_, i) => shown[i]);
  }
  return ok(
    onePage(
      connections
        .filter((c) => !owner || c.owner === owner)
        .sort(
          (a, b) =>
            a.details.provider.localeCompare(b.details.provider) ||
            a.name.localeCompare(b.name)
        )
        .map(sanitizeDataConnection)
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
  const full = DataConnectionSchema.safeParse({
    ...parsed.data,
    data_connection_id: owner ? `${owner}--${slug}` : slug,
  });
  if (!full.success) return fromZodError(full.error);
  if (!(await canManageDataConnection(session, full.data))) {
    return forbidden("You may not create this data connection");
  }

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
  const full = DataConnectionSchema.safeParse({ ...existing, ...changes });
  if (!full.success) return fromZodError(full.error);

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
