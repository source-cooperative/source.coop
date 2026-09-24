import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { MembershipRole } from "@/types";
import { ProductAccessList, type ProductAccess } from "./ProductAccessList";

/**
 * How much of each of its owner's products a service account reaches: none,
 * read, or read and write, one row per product. Each title opens the product
 * in a new tab, so a manager can check what it holds before granting it.
 *
 * The create form and the account's page both use it. The form holds the
 * choices until it is submitted; the page saves each one as it is made. The
 * stories hold them in state, so the controls can be clicked.
 */
const meta = {
  title: "Features/Service accounts/ProductAccessList",
  component: ProductAccessList,
  parameters: { layout: "padded" },
  args: {
    ownerAccountId: "miskatonic",
    onChange: fn(),
    products: [
      { product_id: "climate-data", title: "Climate Data" },
      { product_id: "reference-data", title: "Reference Data" },
      { product_id: "field-notes", title: "Field Notes" },
    ],
    access: {},
  },
  render: function Controlled(args) {
    const [access, setAccess] = useState(args.access);
    return (
      <ProductAccessList
        {...args}
        access={access}
        onChange={(product_id, next) => {
          args.onChange(product_id, next);
          setAccess((all) => {
            const { [product_id]: _dropped, ...rest } = all;
            return next ? { ...rest, [product_id]: next } : rest;
          });
        }}
      />
    );
  },
} satisfies Meta<typeof ProductAccessList>;

export default meta;
type Story = StoryObj<typeof meta>;

/** As the create form opens: nothing granted yet. */
export const NothingGranted: Story = {};

/** An account that writes one product and reads another. */
export const SomeGranted: Story = {
  args: {
    access: {
      "climate-data": MembershipRole.WriteData as ProductAccess,
      "reference-data": MembershipRole.ReadData as ProductAccess,
    },
  },
};

/** Disabled while the account's page saves a change. */
export const Saving: Story = {
  args: { ...SomeGranted.args, disabled: true },
};

/** An owner with no products has nothing to grant. */
export const NoProducts: Story = {
  args: { products: [] },
};
