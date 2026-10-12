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
import { canCreateProductForAccount, isAuthorized } from "@/lib/api/authz";
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
import {
  conflict,
  forbidden,
  fromZodError,
  invalid,
  notFound,
  ok,
  OperationResult,
  unauthenticated,
} from "./result";

/** The id is derived from `name` and `owner`, so neither caller nor form sets it. */
export const CreateDataConnectionSchema = DataConnectionObjectSchema.omit({
  data_connection_id: true,
}).openapi("CreateDataConnection");

/**
 * Top-level fields replace the stored ones; a field left out keeps its stored
 * value. `owner` is not here: a connection never changes hands.
 */
export const UpdateDataConnectionSchema = DataConnectionObjectSchema.omit({
  data_connection_id: true,
  owner: true,
})
  .partial()
  .openapi("UpdateDataConnection");

export const ListDataConnectionsQuerySchema = z.object({
  owner: z.string().optional().openapi({
    description:
      "Only the connections this account owns: the management view, which leaves out the platform's own.",
  }),
  usable_for: z.string().optional().openapi({
    description:
      "Only the connections the caller may create a product on under this account, the platform's own included.",
  }),
});

const deny = (session: UserSession | null, message: string) =>
  session ? forbidden(message) : unauthenticated();

const raced = (error: unknown) =>
  error instanceof Error && error.name === "ConditionalCheckFailedException";

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
 * The whole connection, checked across fields. An owned connection is already
 * confined to its owner's products, so it never carries a platform flag.
 */
const complete = (c: Record<string, unknown>) =>
  DataConnectionSchema.safeParse({
    ...c,
    required_flag: c.owner ? undefined : c.required_flag,
  });

/**
 * Secrets never leave the database, so a client editing a connection can't
 * send them back: a blank or missing secret under the same authentication type
 * keeps the stored one.
 */
function withStoredSecrets(input: unknown, stored: DataConnection) {
  const auth = (input as { authentication?: Record<string, unknown> } | null)
    ?.authentication;
  if (!auth || auth.type !== stored.authentication?.type) return input;
  const given = Object.entries(auth).filter(([, v]) => v !== "");
  return {
    ...(input as object),
    authentication: { ...stored.authentication, ...Object.fromEntries(given) },
  };
}

export async function listDataConnections(
  session: UserSession | null,
  query: unknown
): Promise<OperationResult<DataConnection[]>> {
  const parsed = ListDataConnectionsQuerySchema.safeParse(query);
  if (!parsed.success) return fromZodError(parsed.error);
  const { owner, usable_for } = parsed.data;

  let connections: DataConnection[];
  if (usable_for) {
    const account = await accountsTable.fetchById(usable_for);
    if (!account) return notFound(`Account ${usable_for} not found`);
    // UseDataConnection judges only the connection, so the account is checked
    // here: otherwise anyone could list an account's own buckets by naming it.
    if (!canCreateProductForAccount(session, account)) {
      return deny(session, "You may not create products under this account");
    }
    connections = await listUsableDataConnections(session, [usable_for]);
  } else {
    connections = (await dataConnectionsTable.listAll()).filter((c) =>
      isAuthorized(session, c, Actions.GetDataConnection)
    );
  }
  return ok(
    connections
      .filter((c) => !owner || c.owner === owner)
      .map(sanitizeDataConnection)
  );
}

export async function getDataConnection(
  session: UserSession | null,
  data_connection_id: string
): Promise<OperationResult<DataConnection>> {
  const connection = await dataConnectionsTable.fetchById(data_connection_id);
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

  try {
    await dataConnectionsTable.create(full.data);
  } catch (error) {
    if (!raced(error)) throw error;
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
  const connection = await dataConnectionsTable.fetchById(data_connection_id);
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
  const full = complete({ ...existing, ...parsed.data });
  if (!full.success) return fromZodError(full.error);

  try {
    // update() requires the row to still exist, so a concurrent delete isn't
    // undone by this write.
    await dataConnectionsTable.update(full.data);
  } catch (error) {
    if (!raced(error)) throw error;
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
