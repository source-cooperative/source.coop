import { z } from "zod";
import {
  Actions,
  Product,
  ProductCreationRequestSchema,
  ProductSchema,
  ProductResponse,
  ProductResponseSchema,
  RepositoryPermissions,
  resolveMirrorPrefix,
  UserSession,
} from "@/types";
import { canListOnProfile, isAdmin, isAuthorized } from "@/lib/api/authz";
import { denyDataConnectionFor } from "@/lib/data-connections";
import { LOGGER } from "@/lib/logging";
import { getProxyCredentials } from "@/lib/actions/proxy-credentials";
import { getStorageClient } from "@/lib/clients/storage";
import { accountUrl, editProductDetailsUrl, productUrl } from "@/lib/urls";
import { revalidatePath } from "next/cache";
import {
  accountsTable,
  dataConnectionsTable,
  membershipsTable,
  productsTable,
  tagsTable,
} from "@/lib/clients/database";
import {
  conflict,
  deny,
  forbidden,
  fromZodError,
  invalid,
  notFound,
  ok,
  OperationResult,
  type Page,
  pageSchema,
  PageQuerySchema,
  decodeCursor,
  encodeCursor,
  unauthenticated,
} from "./result";
import { publicView } from "./accounts";
import { canonTag } from "@/lib/tags/canon";

export const ListProductsQuerySchema = PageQuerySchema.extend({
  q: z
    .string()
    .optional()
    .openapi({ description: "Text the title, description or IDs contain." }),
  tags: z
    .string()
    .optional()
    .openapi({
      description:
        "Comma-separated tags, every one of which a product has. Each is read in the tags' own spelling, so `New Zealand` finds `new-zealand`.",
    }),
  featured: z.enum(["true", "false"]).optional(),
  limit: PageQuerySchema.shape.limit.openapi({
    description: "At most this many, except with `q` or `tags`, whose pages can hold more.",
  }),
});

export const ProductPageSchema = pageSchema("ProductPage", ProductResponseSchema);

const TagsSchema = z.array(z.string()).openapi({
  description:
    "Topics people can filter products by. Each tag must be on Source's list of tags. Tags are lowercase with hyphens between words, and `New Zealand` is read as `new-zealand`.",
});

export const CreateProductSchema = ProductCreationRequestSchema.omit({
  search_text: true,
}).extend({
  data_connection_id: z
    .string({ required_error: "A data connection is required" })
    .min(1, "A data connection is required")
    .openapi({ description: "Where the product's data is stored. Fixed once created." }),
  tags: TagsSchema.optional(),
}).openapi("CreateProduct");

export const UpdateProductSchema = ProductSchema.pick({
  title: true,
  description: true,
  visibility: true,
  disabled: true,
})
  .extend({
    title: ProductSchema.shape.title.trim().min(1, "A title is required"),
    tags: TagsSchema.openapi({
      description:
        "Replaces the product's tags. Each tag must be on Source's list of tags. Tags are lowercase with hyphens between words, and `New Zealand` is read as `new-zealand`. A tag the product already has is kept even if the list has dropped it. Omit the field to leave the tags as they are.",
    }),
  })
  .partial()
  .openapi("UpdateProduct");

/**
 * The tags as they are stored, one per spelling, or the error naming those
 * outside the corpus. Each tag is matched by its one spelling (canonTag): to
 * the corpus's entry if there is one, and otherwise to a tag the product
 * already carries, which is kept as it is even if the corpus has since dropped
 * it, so editing some other field isn't blocked by a tag nobody chose today.
 */
async function checkTags(
  tags: string[],
  current: string[] = []
): Promise<OperationResult<string[]>> {
  const keys = [...new Set(tags.map(canonTag).filter(Boolean))];
  if (!keys.length) return ok([]);
  const bySpelling = (list: string[]) => new Map(list.map((t) => [canonTag(t), t]));
  const corpus = bySpelling(await tagsTable.listAll());
  const carried = bySpelling(current);
  const unknown = keys.filter((key) => !corpus.has(key) && !carried.has(key));
  return unknown.length
    ? invalid(`Unknown tags: ${unknown.join(", ")}`, "tags")
    : ok(keys.map((key) => corpus.get(key) ?? carried.get(key)!));
}

export const DeleteProductQuerySchema = z.object({
  preserve_data: z.enum(["true", "false"]).default("false").openapi({
    description:
      "Keep the product's objects in storage. Allowed when the storage is read-only or belongs to an account; on Source-managed storage, only an admin may.",
  }),
});

// A cursor is DynamoDB's LastEvaluatedKey, base64url'd so it survives a query
// string unescaped: the key attributes of the table, plus the index's for the
// public listing. One that names other attributes, another partition, or a
// place outside the query (an unfeatured product, when listing featured ones)
// is refused here rather than by DynamoDB.
const accountCursor = (account_id: string) =>
  z.object({ account_id: z.literal(account_id), product_id: z.string() }).strict();
const publicCursor = (featuredOnly: boolean) =>
  z
    .object({
      account_id: z.string(),
      product_id: z.string(),
      visibility: z.literal("public"),
      featured: featuredOnly ? z.number().positive() : z.number(),
    })
    .strict();

/**
 * `product` with as much of its account as the caller may read: the whole
 * record for whoever GetAccount allows, and otherwise its public view. The
 * record also holds its people's emails, Ory identity, flags and private
 * metadata.
 */
function shown(session: UserSession | null, product: Product): ProductResponse {
  const { account } = product;
  if (!account || isAuthorized(session, account, Actions.GetAccount)) return product;
  return { ...product, account: publicView(account) };
}

// ponytail: filtering after the read can leave a page short of `limit`; the
// cursor still moves on correctly.
const page = (
  session: UserSession | null,
  items: Product[],
  lastEvaluatedKey: unknown
): Page<ProductResponse> => ({
  items: items.map((p) => shown(session, p)),
  next_cursor: encodeCursor(lastEvaluatedKey),
});

/**
 * Drops the cached pages that show a product, and its account's listing of
 * it, whichever adapter changed it.
 */
export function revalidate(account_id: string, product_id?: string) {
  revalidatePath(accountUrl(account_id));
  if (product_id) {
    revalidatePath(productUrl(account_id, product_id));
    revalidatePath(editProductDetailsUrl(account_id, product_id));
  }
}

/**
 * A refusal to act on `product`. A deactivated product is indistinguishable
 * from a missing one to anyone not allowed to see it.
 */
const refuse = (session: UserSession | null, product: Product, message: string) =>
  product.disabled && !isAuthorized(session, product, Actions.GetRepository)
    ? notFound(`Product ${product.account_id}/${product.product_id} not found`)
    : deny(session, message);

/**
 * One page of products: an account's, when `account_id` is given, and
 * otherwise the public ones, searched and filtered by `query`.
 */
export async function listProducts(
  session: UserSession | null,
  query: unknown,
  account_id?: string
): Promise<OperationResult<Page<ProductResponse>>> {
  const parsed = (account_id ? PageQuerySchema : ListProductsQuerySchema).safeParse(query);
  if (!parsed.success) return fromZodError(parsed.error);
  const { cursor, limit } = parsed.data;
  const { q, tags, featured } = parsed.data as z.infer<typeof ListProductsQuerySchema>;
  const featuredOnly = featured === "true";
  const start = cursor
    ? decodeCursor(cursor, account_id ? accountCursor(account_id) : publicCursor(featuredOnly))
    : undefined;
  if (start === null) return invalid("Invalid cursor", "cursor");

  if (account_id) {
    const [account, result] = await Promise.all([
      accountsTable.fetchById(account_id),
      productsTable.listByAccount(account_id, limit, start),
    ]);
    if (!account) return notFound(`Account ${account_id} not found`);
    return ok(
      page(
        session,
        result.products
          .filter((p) => canListOnProfile(session, p))
          .map((p) => ({ ...p, account })),
        result.lastEvaluatedKey
      )
    );
  }

  const result = await productsTable.listPublic(limit, start, {
    search: q,
    // In the spelling tags are stored in, so `?tags=New Zealand` finds them.
    tags: tags?.split(",").map(canonTag).filter(Boolean).join(",") || undefined,
    featuredOnly,
  });
  return ok(
    page(
      session,
      await productsTable.attachAccounts(
        result.products.filter((p) => isAuthorized(session, p, Actions.ListRepository))
      ),
      result.lastEvaluatedKey
    )
  );
}

export async function getProduct(
  session: UserSession | null,
  account_id: string,
  product_id: string
): Promise<OperationResult<ProductResponse>> {
  const product = await productsTable.fetchById(account_id, product_id);
  if (!product) return notFound(`Product ${account_id}/${product_id} not found`);
  if (!isAuthorized(session, product, Actions.GetRepository)) {
    // Tells a token that didn't resolve to a session (see the
    // authenticateWithOidcToken warnings) from a session that may not read.
    LOGGER.warn("Product read authorization denied", {
      operation: "getProduct",
      metadata: {
        hasSession: !!session,
        sessionAccountId: session?.account?.account_id,
        productAccountId: account_id,
        productId: product_id,
        visibility: product.visibility,
      },
    });
    return refuse(session, product, "You may not view this product");
  }
  return ok(shown(session, product));
}

/**
 * Creates a product backed by a data connection, which fixes where its data
 * lives for good.
 */
export async function createProduct(
  session: UserSession | null,
  input: unknown
): Promise<OperationResult<Product>> {
  if (!session) return unauthenticated();
  const parsed = CreateProductSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const { data_connection_id, tags: requestedTags = [], ...request } = parsed.data;
  const { account_id, product_id } = request;

  // Before any lookup, so a caller who may not create products here learns
  // nothing about which connections exist or what they allow.
  if (
    !isAuthorized(session, { account_id, product_id } as Product, Actions.CreateRepository)
  ) {
    return forbidden("You may not create products for this account");
  }
  const [account, existing, connection] = await Promise.all([
    accountsTable.fetchById(account_id),
    productsTable.fetchById(account_id, product_id),
    dataConnectionsTable.fetchById(data_connection_id),
  ]);
  if (!account) return notFound(`Account ${account_id} not found`);
  // ponytail: check-then-put, so two simultaneous creates can still race;
  // a conditional put in productsTable.create closes it if that ever matters.
  if (existing) return conflict(`Product ${account_id}/${product_id} already exists`);
  if (!connection) {
    return invalid("Selected data connection was not found", "data_connection_id");
  }
  switch (denyDataConnectionFor(session, connection, account_id)) {
    case "not-usable":
      return forbidden("You are not permitted to use the selected data connection");
    case "wrong-account":
      return invalid(
        "Selected data connection is not available for this account",
        "data_connection_id"
      );
  }
  if (!connection.allowed_visibilities.includes(request.visibility)) {
    return invalid(
      `The "${connection.name}" data connection does not allow ${request.visibility} products`,
      "visibility"
    );
  }
  const tags = await checkTags(requestedTags);
  if (!tags.ok) return tags;

  const now = new Date().toISOString();
  const product: Product = {
    ...request,
    created_at: now,
    updated_at: now,
    disabled: false,
    featured: 0,
    metadata: {
      tags: tags.value,
      primary_mirror: data_connection_id,
      mirrors: {
        [data_connection_id]: {
          connection_id: data_connection_id,
          prefix: resolveMirrorPrefix(connection.prefix_template, account_id, product_id),
          is_primary: true,
        },
      },
    },
  };
  await productsTable.create(product);
  revalidate(account_id);
  return ok(product);
}

export async function updateProduct(
  session: UserSession | null,
  account_id: string,
  product_id: string,
  input: unknown
): Promise<OperationResult<ProductResponse>> {
  if (!session) return unauthenticated();
  // DynamoDB rejects an empty key outright.
  const product =
    account_id && product_id && (await productsTable.fetchById(account_id, product_id));
  if (!product) return notFound(`Product ${account_id}/${product_id} not found`);
  // Reactivating a deactivated product is admin-only: PutRepository refuses
  // everyone else on a deactivated product.
  if (!isAuthorized(session, product, Actions.PutRepository)) {
    return refuse(session, product, "You may not edit this product");
  }
  const parsed = UpdateProductSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const { tags: requestedTags, ...fields } = parsed.data;
  // Zod keeps a key given as undefined, which would blank the stored value.
  const changes: Partial<Product> = Object.fromEntries(
    Object.entries(fields).filter(([, value]) => value !== undefined)
  );
  if (requestedTags) {
    const tags = await checkTags(requestedTags, product.metadata?.tags);
    if (!tags.ok) return tags;
    changes.metadata = { ...product.metadata, tags: tags.value };
  }
  // The data connection is fixed at creation, so the allowed visibilities
  // come from the primary mirror's. Without it there's no knowing what's
  // allowed, so the visibility stays as it is.
  const { visibility } = parsed.data;
  if (visibility && visibility !== product.visibility) {
    // The primary is a key into `mirrors`, which on older products isn't the
    // connection's ID.
    const { mirrors, primary_mirror } = product.metadata ?? {};
    const id = mirrors?.[primary_mirror]?.connection_id;
    const connection = id ? await dataConnectionsTable.fetchById(id) : null;
    if (!connection) {
      return invalid(
        "This product's data connection could not be found, so its visibility cannot be changed",
        "visibility"
      );
    }
    if (!connection.allowed_visibilities.includes(visibility)) {
      return invalid(
        `The "${connection.name}" data connection does not allow ${visibility} products`,
        "visibility"
      );
    }
  }

  const updated = {
    // The row as written, with the account it doesn't store.
    ...(await productsTable.update({ ...product, ...changes })),
    account: product.account,
  };
  revalidate(account_id, product_id);
  LOGGER.info("Product updated", {
    operation: "updateProduct",
    metadata: {
      account_id,
      product_id,
      by: session.account?.account_id,
      ...fields,
      ...(requestedTags && { tags: changes.metadata?.tags }),
    },
  });
  return ok(shown(session, updated));
}

/**
 * Deletes a product, its memberships and, unless asked to keep them, its
 * objects. The objects are deleted through the data proxy with the caller's
 * own credentials, so the proxy enforces per-object authorization.
 */
export async function deleteProduct(
  session: UserSession | null,
  account_id: string,
  product_id: string,
  query: unknown
): Promise<OperationResult<ProductResponse>> {
  if (!session) return unauthenticated();
  // DynamoDB rejects an empty key outright.
  const product =
    account_id && product_id && (await productsTable.fetchById(account_id, product_id));
  if (!product) return notFound(`Product ${account_id}/${product_id} not found`);
  if (!isAuthorized(session, product, Actions.DeleteRepository)) {
    return refuse(session, product, "You may not delete this product");
  }
  const parsed = DeleteProductQuerySchema.safeParse(query);
  if (!parsed.success) return fromZodError(parsed.error);
  const preserveData = parsed.data.preserve_data === "true";

  const mirror = product.metadata?.mirrors?.[product.metadata.primary_mirror];
  const connection = mirror
    ? await dataConnectionsTable.fetchById(mirror.connection_id)
    : undefined;
  // A read-only connection's data is never ours to delete, and an account's
  // own connection is its business; on Source-managed storage only an admin
  // may leave objects behind, so the platform doesn't collect orphans.
  if (preserveData && !connection?.read_only && !connection?.owner && !isAdmin(session)) {
    return forbidden("You are not permitted to keep this product's data when deleting it.");
  }

  // The proxy addresses every backend as bucket=account_id, key=product_id/….
  // The credentials are minted for this session's identity rather than read
  // from the cookie cache, which belongs to whoever's browser sent the
  // request, not necessarily to the bearer token it carries.
  if (!preserveData && connection && !connection.read_only) {
    if (!session.identity_id) {
      return forbidden("Only a person can delete a product's stored objects.");
    }
    const storage = await getStorageClient(await getProxyCredentials(session.identity_id));
    await storage.deleteByPrefix(account_id, `${product_id}/`);
  }
  await membershipsTable.deleteByProduct(account_id, product_id);
  await productsTable.delete(account_id, product_id);
  revalidate(account_id, product_id);

  LOGGER.info("Product deleted", {
    operation: "deleteProduct",
    metadata: { account_id, product_id, by: session.account?.account_id, preserveData },
  });
  return ok(shown(session, product));
}

/**
 * What the caller may do with a product's data: `read`, `write` or both. A
 * caller who may read none of it is refused as `getProduct` refuses them, so
 * this reveals no more about a product than viewing it does.
 */
export async function getProductPermissions(
  session: UserSession | null,
  account_id: string,
  product_id: string
): Promise<OperationResult<RepositoryPermissions[]>> {
  const product = await productsTable.fetchById(account_id, product_id);
  if (!product) return notFound(`Product ${account_id}/${product_id} not found`);
  if (!isAuthorized(session, product, Actions.ReadRepositoryData)) {
    return refuse(session, product, "You may not read this product's data");
  }
  const permissions: RepositoryPermissions[] = [];
  if (isAuthorized(session, product, Actions.WriteRepositoryData)) {
    permissions.push(RepositoryPermissions.Write);
  }
  permissions.push(RepositoryPermissions.Read);
  return ok(permissions);
}
