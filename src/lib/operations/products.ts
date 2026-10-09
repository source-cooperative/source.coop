import { z } from "zod";
import {
  Actions,
  Product,
  ProductCreationRequestSchema,
  ProductSchema,
  resolveMirrorPrefix,
  UserSession,
} from "@/types";
import { canListOnProfile, isAdmin, isAuthorized } from "@/lib/api/authz";
import { denyDataConnectionFor } from "@/lib/data-connections";
import { LOGGER } from "@/lib/logging";
import { getProxyCredentials } from "@/lib/actions/proxy-credentials";
import { getStorageClient } from "@/lib/clients/storage";
import {
  accountsTable,
  dataConnectionsTable,
  membershipsTable,
  productsTable,
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
  unauthenticated,
} from "./result";

export const PageQuerySchema = z.object({
  cursor: z
    .string()
    .optional()
    .openapi({ description: "The `next_cursor` of the previous page." }),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const ListProductsQuerySchema = PageQuerySchema.extend({
  q: z
    .string()
    .optional()
    .openapi({ description: "Text the title, description or IDs contain." }),
  tags: z
    .string()
    .optional()
    .openapi({ description: "Comma-separated tags, every one of which a product has." }),
  featured: z.enum(["true", "false"]).optional(),
  limit: PageQuerySchema.shape.limit.openapi({
    description: "At most this many, except with `q` or `tags`, whose pages can hold more.",
  }),
});

export const ProductPageSchema = z
  .object({
    items: z.array(ProductSchema),
    next_cursor: z
      .string()
      .nullable()
      .openapi({ description: "Pass as `cursor` for the next page; null on the last." }),
  })
  .openapi("ProductPage");

export const CreateProductSchema = ProductCreationRequestSchema.omit({
  search_text: true,
}).extend({
  data_connection_id: z
    .string({ required_error: "A data connection is required" })
    .min(1, "A data connection is required")
    .openapi({ description: "Where the product's data is stored. Fixed once created." }),
}).openapi("CreateProduct");

export const UpdateProductSchema = ProductSchema.pick({
  title: true,
  description: true,
  visibility: true,
  disabled: true,
})
  .partial()
  .openapi("UpdateProduct");

export const DeleteProductQuerySchema = z.object({
  preserve_data: z.enum(["true", "false"]).default("false").openapi({
    description:
      "Keep the product's objects in storage. Allowed when the storage is read-only or belongs to an account; on Source-managed storage, only an admin may.",
  }),
});

type ProductPage = z.infer<typeof ProductPageSchema>;

// A cursor is DynamoDB's LastEvaluatedKey, base64'd: the key attributes of
// the table, plus the index's for the public listing. One that names other
// attributes, or another partition, is refused here rather than by DynamoDB.
const accountCursor = (account_id: string) =>
  z.object({ account_id: z.literal(account_id), product_id: z.string() }).strict();
const publicCursor = z
  .object({
    account_id: z.string(),
    product_id: z.string(),
    visibility: z.literal("public"),
    featured: z.number(),
  })
  .strict();

function decodeCursor(cursor: string, schema: z.ZodTypeAny) {
  try {
    const key = schema.safeParse(JSON.parse(Buffer.from(cursor, "base64").toString()));
    if (key.success) return key.data as Record<string, unknown>;
  } catch {}
  return null;
}

const encodeCursor = (key: unknown) =>
  key ? Buffer.from(JSON.stringify(key)).toString("base64") : null;

const page = async (
  result: { products: Product[]; lastEvaluatedKey: unknown },
  visible: (p: Product) => boolean
): Promise<ProductPage> => ({
  // ponytail: filtering after the read can leave a page short of `limit`;
  // the cursor still moves on correctly.
  items: await productsTable.attachAccounts(result.products.filter(visible)),
  next_cursor: encodeCursor(result.lastEvaluatedKey),
});

/**
 * One page of products: an account's, when `account_id` is given, and
 * otherwise the public ones, searched and filtered by `query`.
 */
export async function listProducts(
  session: UserSession | null,
  query: unknown,
  account_id?: string
): Promise<OperationResult<ProductPage>> {
  const parsed = (account_id ? PageQuerySchema : ListProductsQuerySchema).safeParse(query);
  if (!parsed.success) return fromZodError(parsed.error);
  const { cursor, limit } = parsed.data;
  const start = cursor
    ? decodeCursor(cursor, account_id ? accountCursor(account_id) : publicCursor)
    : undefined;
  if (start === null) return invalid("Invalid cursor", "cursor");

  if (account_id) {
    if (!(await accountsTable.fetchById(account_id))) {
      return notFound(`Account ${account_id} not found`);
    }
    return ok(
      await page(await productsTable.listByAccount(account_id, limit, start), (p) =>
        canListOnProfile(session, p)
      )
    );
  }

  const { q, tags, featured } = parsed.data as z.infer<typeof ListProductsQuerySchema>;
  return ok(
    await page(
      await productsTable.listPublic(limit, start, {
        search: q,
        tags,
        featuredOnly: featured === "true",
      }),
      (p) => isAuthorized(session, p, Actions.ListRepository)
    )
  );
}

export async function getProduct(
  session: UserSession | null,
  account_id: string,
  product_id: string
): Promise<OperationResult<Product>> {
  const product = await productsTable.fetchById(account_id, product_id);
  const missing = notFound(`Product ${account_id}/${product_id} not found`);
  if (!product) return missing;
  if (!isAuthorized(session, product, Actions.GetRepository)) {
    // A deactivated product is indistinguishable from a missing one to
    // anyone not allowed to see it.
    if (product.disabled) return missing;
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
    return deny(session, "You may not view this product");
  }
  return ok(product);
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
  const { data_connection_id, ...request } = parsed.data;
  const { account_id, product_id } = request;

  // Before any lookup, so a caller who may not create products here learns
  // nothing about which connections exist or what they allow.
  if (
    !isAuthorized(session, { account_id, product_id } as Product, Actions.CreateRepository)
  ) {
    return forbidden("You may not create products for this account");
  }
  if (!(await accountsTable.fetchById(account_id))) {
    return notFound(`Account ${account_id} not found`);
  }
  // ponytail: check-then-put, so two simultaneous creates can still race;
  // a conditional put in productsTable.create closes it if that ever matters.
  if (await productsTable.fetchById(account_id, product_id)) {
    return conflict(`Product ${account_id}/${product_id} already exists`);
  }

  const connection = await dataConnectionsTable.fetchById(data_connection_id);
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

  const now = new Date().toISOString();
  const product: Product = {
    ...request,
    created_at: now,
    updated_at: now,
    disabled: false,
    featured: 0,
    metadata: {
      tags: [],
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
  return ok(await productsTable.create(product));
}

export async function updateProduct(
  session: UserSession | null,
  account_id: string,
  product_id: string,
  input: unknown
): Promise<OperationResult<Product>> {
  if (!session) return unauthenticated();
  const parsed = UpdateProductSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  // DynamoDB rejects an empty key outright.
  const product =
    account_id && product_id && (await productsTable.fetchById(account_id, product_id));
  if (!product) return notFound(`Product ${account_id}/${product_id} not found`);
  // Reactivating a deactivated product is admin-only: PutRepository refuses
  // everyone else on a deactivated product.
  if (!isAuthorized(session, product, Actions.PutRepository)) {
    return forbidden("You may not edit this product");
  }

  // The data connection is fixed at creation, so the allowed visibilities
  // come from the primary mirror's. Without it there's no knowing what's
  // allowed, so the visibility stays as it is.
  // Zod keeps a key given as undefined, which would blank the stored value.
  const changes = Object.fromEntries(
    Object.entries(parsed.data).filter(([, value]) => value !== undefined)
  );
  const { visibility } = parsed.data;
  if (visibility && visibility !== product.visibility) {
    const id = product.metadata?.primary_mirror;
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

  const updated = await productsTable.update({
    ...product,
    ...changes,
    updated_at: new Date().toISOString(),
  });
  LOGGER.info("Product updated", {
    operation: "updateProduct",
    metadata: { account_id, product_id, by: session.account?.account_id, ...changes },
  });
  return ok(updated);
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
): Promise<OperationResult<Product>> {
  if (!session) return unauthenticated();
  const parsed = DeleteProductQuerySchema.safeParse(query);
  if (!parsed.success) return fromZodError(parsed.error);
  const preserveData = parsed.data.preserve_data === "true";
  const product = await productsTable.fetchById(account_id, product_id);
  if (!product) return notFound(`Product ${account_id}/${product_id} not found`);
  if (!isAuthorized(session, product, Actions.DeleteRepository)) {
    return forbidden("You may not delete this product");
  }

  const mirror = product.metadata.mirrors[product.metadata.primary_mirror];
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
      return forbidden(
        "Only a person can delete a product's stored objects; keep them with preserve_data, or delete it signed in as a person."
      );
    }
    const storage = await getStorageClient(
      await getProxyCredentials(session.identity_id)
    );
    await storage.deleteByPrefix(account_id, `${product_id}/`);
  }
  await membershipsTable.deleteByProduct(account_id, product_id);
  await productsTable.delete(account_id, product_id);

  LOGGER.info("Product deleted", {
    operation: "deleteProduct",
    metadata: { account_id, product_id, by: session.account?.account_id, preserveData },
  });
  return ok(product);
}
