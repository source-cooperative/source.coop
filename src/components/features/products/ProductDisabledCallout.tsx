import Link from "next/link";
import { Box, Callout, Link as RadixLink } from "@radix-ui/themes";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import type { Product } from "@/types";
import { editProductDetailsUrl } from "@/lib/urls";

/**
 * The warning a product page shows to the few who can see a disabled product:
 * its owners, maintainers and admins. A product is disabled by being
 * deactivated itself or by belonging to a disabled account; the second takes
 * precedence, since reactivating the product alone would not bring it back.
 * `canDelete` links to the settings page where it can be deleted, which the
 * page offers no other way to reach once the product can't be edited.
 */
export function ProductDisabledCallout({
  product,
  canDelete,
}: {
  product: Product;
  canDelete: boolean;
}) {
  if (!product.disabled && !product.account?.disabled) return null;
  return (
    <Box mt="4">
      <Callout.Root color="amber" role="alert">
        <Callout.Icon>
          <ExclamationTriangleIcon />
        </Callout.Icon>
        <Callout.Text>
          {product.account?.disabled
            ? `This product is disabled because its account, ${product.account.name}, is disabled. It is hidden from everyone except its owners and administrators, and can only be deleted.`
            : "This product is deactivated. It is hidden from everyone except its owners and administrators."}
          {canDelete && product.account?.disabled && (
            <>
              {" "}
              <RadixLink asChild>
                <Link href={editProductDetailsUrl(product.account_id, product.product_id)}>
                  Delete it
                </Link>
              </RadixLink>
            </>
          )}
        </Callout.Text>
      </Callout.Root>
    </Box>
  );
}
