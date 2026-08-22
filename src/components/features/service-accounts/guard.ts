import { notFound } from "next/navigation";
import { accountsTable, productsTable } from "@/lib/clients/database";
import { getPageSession } from "@/lib/api/utils";
import { isAuthorized } from "@/lib/api/authz";
import { Actions } from "@/types";

/**
 * Shared gate for the service-account mock pages. You must be able to manage
 * the account to see things that act on its behalf — #491's "creator must hold
 * a qualifying role on the owner account". `ListAccountMemberships` is not
 * enough: it returns true for any signed-in user.
 */
export async function loadAccountOrNotFound(account_id: string) {
  const session = await getPageSession();
  const account = await accountsTable.fetchById(account_id);

  if (!account || !isAuthorized(session, account, Actions.PutAccountProfile)) {
    notFound();
  }

  const products = await productsTable.listByAccountAll(account_id);

  return {
    account,
    ownerType: (account.type === "organization"
      ? "organization"
      : "individual") as "organization" | "individual",
    products: products.map((product) => ({
      product_id: product.product_id,
      title: product.title ?? "",
    })),
  };
}
