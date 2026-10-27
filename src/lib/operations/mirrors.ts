import { z } from "zod";
import { revalidatePath } from "next/cache";
import {
  Product,
  ProductMirror,
  ProductMirrorSchema,
  resolveMirrorPrefix,
  UserSession,
} from "@/types";
import { canManageAccount } from "@/lib/api/authz";
import { isConditionalCheckFailed } from "@/lib/clients/database/errors";
import {
  canManageDataConnection,
  denyDataConnectionFor,
} from "@/lib/data-connections";
import { LOGGER } from "@/lib/logging";
import { editProductDataConnectionsUrl } from "@/lib/urls";
import {
  accountsTable,
  dataConnectionsTable,
  productsTable,
} from "@/lib/clients/database";
import { getProduct, revalidate } from "./products";
import {
  conflict,
  deny,
  forbidden,
  fromZodError,
  invalid,
  notFound,
  ok,
  OperationResult,
  unauthenticated,
} from "./result";

export const MirrorSchema = ProductMirrorSchema.extend({
  key: z.string().openapi({
    description:
      "The mirror's key on the product: its data connection's ID, except on some older products.",
  }),
}).openapi("Mirror");

export type Mirror = z.infer<typeof MirrorSchema>;

export const AddMirrorSchema = z
  .object({
    connection_id: z
      .string({ required_error: "A data connection is required" })
      .min(1, "A data connection is required")
      .openapi({
        description:
          "A data connection available to the product's account: a Source-managed one, or one the account owns.",
      }),
  })
  .openapi("AddMirror");

// Keys are built by literal concatenation (`${prefix}${key}`), so a prefix may
// not climb out of the bucket or start at its root, and always ends in a
// separator: without one, "acct/prod" also matches keys under "acct/prod2/" on
// a shared connection.
// ponytail: no cross-product collision scan; managing the connection already
// grants broad access. Add a scan if prefix overlap becomes a real problem.
const PrefixSchema = z
  .string()
  .trim()
  .refine(
    (p) => !p.includes("..") && !p.startsWith("/"),
    "Prefix can't start with '/' or contain '..'"
  )
  .transform((p) => (!p || p.endsWith("/") ? p : `${p}/`))
  .openapi({
    description:
      "Where the product's objects sit inside the connection; empty for its root. A trailing `/` is added. Changing it needs management of the data connection as well as the account.",
  });

export const UpdateMirrorSchema = z
  .object({
    prefix: PrefixSchema.optional(),
    is_primary: z.literal(true).optional().openapi({
      description:
        "Make this the primary mirror, which visitors download from. To change the primary, promote another mirror.",
    }),
  })
  .refine((body) => body.prefix !== undefined || body.is_primary, {
    message: "Give a prefix, is_primary, or both",
  })
  .openapi("UpdateMirror");

const NOT_ACCOUNT_MANAGER =
  "Only owners and maintainers of the owning account can manage this product's data connections";
const CONCURRENT_EDIT =
  "This product was modified by someone else. Please reload and try again.";

const toMirror = (key: string, mirror: ProductMirror): Mirror => ({
  key,
  ...mirror,
});

/** The mirror at `key`; a key from a URL may name a property of every object. */
const mirrorAt = (product: Product, key: string) =>
  Object.hasOwn(product.metadata.mirrors, key)
    ? product.metadata.mirrors[key]
    : undefined;

/**
 * The product, when `session` administers its owning account. A product's
 * mirrors are that account's storage, so this is the account's gate, not
 * `PutRepository`, which a membership of this one product also satisfies.
 * It's decided before the product is read, so a caller who may not manage the
 * account can't learn which products exist.
 */
async function managedProduct(
  session: UserSession | null,
  account_id: string,
  product_id: string
): Promise<OperationResult<Product>> {
  if (!session) return unauthenticated();
  // DynamoDB rejects an empty key outright.
  const account = account_id && (await accountsTable.fetchById(account_id));
  if (!account || !canManageAccount(session, account)) {
    return deny(session, NOT_ACCOUNT_MANAGER);
  }
  const product =
    product_id && (await productsTable.fetchById(account_id, product_id));
  if (!product) return notFound(`Product ${account_id}/${product_id} not found`);
  return ok(product);
}

/**
 * Writes `product` with new mirrors, unless someone else has written it since
 * it was read: two people editing the same product's mirrors would otherwise
 * clobber each other.
 */
async function saveMirrors(
  product: Product,
  mirrors: Product["metadata"]["mirrors"],
  primary_mirror: string,
  operation: string
): Promise<OperationResult<void>> {
  try {
    await productsTable.update(
      { ...product, metadata: { ...product.metadata, mirrors, primary_mirror } },
      { expectedUpdatedAt: product.updated_at }
    );
  } catch (error) {
    if (isConditionalCheckFailed(error)) {
      return conflict(CONCURRENT_EDIT);
    }
    throw error;
  }
  const { account_id, product_id } = product;
  // The primary mirror is what the product's pages serve from.
  revalidate(account_id, product_id);
  revalidatePath(editProductDataConnectionsUrl(account_id, product_id));
  LOGGER.info("Product mirrors changed", {
    operation,
    metadata: { account_id, product_id, primary_mirror },
  });
  return ok(undefined);
}

/** A product's mirrors, to whoever may read the product. */
export async function listMirrors(
  session: UserSession | null,
  account_id: string,
  product_id: string
): Promise<OperationResult<Mirror[]>> {
  const result = await getProduct(session, account_id, product_id);
  if (!result.ok) return result;
  return ok(
    Object.entries(result.value.metadata.mirrors).map(([key, m]) => toMirror(key, m))
  );
}

/**
 * Mirrors a product to another data connection. The product's first mirror
 * becomes its primary.
 */
export async function addMirror(
  session: UserSession | null,
  account_id: string,
  product_id: string,
  input: unknown
): Promise<OperationResult<Mirror>> {
  const parsed = AddMirrorSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const found = await managedProduct(session, account_id, product_id);
  if (!found.ok) return found;
  const product = found.value;
  const { connection_id } = parsed.data;

  const connection = await dataConnectionsTable.fetchById(connection_id);
  if (!connection) {
    return invalid("Data connection not found", "connection_id");
  }
  switch (denyDataConnectionFor(session, connection, account_id)) {
    case "not-usable":
      return forbidden("You are not permitted to use this data connection");
    case "wrong-account":
      return invalid(
        "This data connection is not available for this account",
        "connection_id"
      );
  }
  const { mirrors, primary_mirror } = product.metadata;
  // Older products key mirrors by other names, and the new mirror's key must
  // not overwrite one of those either.
  if (
    Object.hasOwn(mirrors, connection_id) ||
    Object.values(mirrors).some((m) => m.connection_id === connection_id)
  ) {
    return conflict("This data connection is already associated with this product");
  }

  const isFirst = Object.keys(mirrors).length === 0;
  const mirror: ProductMirror = {
    connection_id,
    prefix: resolveMirrorPrefix(connection.prefix_template, account_id, product_id),
    is_primary: isFirst,
  };
  const saved = await saveMirrors(
    product,
    { ...mirrors, [connection_id]: mirror },
    isFirst ? connection_id : primary_mirror,
    "addMirror"
  );
  return saved.ok ? ok(toMirror(connection_id, mirror)) : saved;
}

/**
 * Changes a mirror's prefix, makes it the primary, or both, in one write.
 */
export async function updateMirror(
  session: UserSession | null,
  account_id: string,
  product_id: string,
  key: string,
  input: unknown
): Promise<OperationResult<Mirror>> {
  const parsed = UpdateMirrorSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const found = await managedProduct(session, account_id, product_id);
  if (!found.ok) return found;
  const product = found.value;
  const { prefix, is_primary } = parsed.data;
  const existing = mirrorAt(product, key);
  if (!existing) return notFound("Mirror not found");

  // A prefix says where in the bucket this product's data lives, so on a
  // shared Source-managed connection a free choice of it would let one account
  // point its product at another's objects. Only someone who also controls the
  // connection may re-point a mirror on it.
  if (prefix !== undefined) {
    const connection = await dataConnectionsTable.fetchById(existing.connection_id);
    if (!connection || !(await canManageDataConnection(session, connection))) {
      return forbidden(
        "You must be able to manage both this account and the data connection to edit its prefix"
      );
    }
  }

  const mirrors = Object.fromEntries(
    Object.entries(product.metadata.mirrors).map(([k, m]) => [
      k,
      {
        ...m,
        ...(k === key && prefix !== undefined && { prefix }),
        ...(is_primary && { is_primary: k === key }),
      },
    ])
  );
  const saved = await saveMirrors(
    product,
    mirrors,
    is_primary ? key : product.metadata.primary_mirror,
    "updateMirror"
  );
  return saved.ok ? ok(toMirror(key, mirrors[key])) : saved;
}

/**
 * Stops mirroring a product to a data connection; the objects stay where they
 * are. Removing the primary promotes the first mirror left, if any.
 */
export async function removeMirror(
  session: UserSession | null,
  account_id: string,
  product_id: string,
  key: string
): Promise<OperationResult<Mirror>> {
  const found = await managedProduct(session, account_id, product_id);
  if (!found.ok) return found;
  const product = found.value;
  const removed = mirrorAt(product, key);
  if (!removed) return notFound("Mirror not found");
  const { [key]: _, ...remaining } = product.metadata.mirrors;

  let primary = product.metadata.primary_mirror;
  if (primary === key) {
    primary = Object.keys(remaining)[0] ?? "";
    if (primary) remaining[primary] = { ...remaining[primary], is_primary: true };
  }
  const saved = await saveMirrors(product, remaining, primary, "removeMirror");
  return saved.ok ? ok(toMirror(key, removed)) : saved;
}
