import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { MembershipRole } from "@/types";
import { ProductAccessList, type ProductAccess } from "./ProductAccessList";

/**
 * The products a service account reaches, each with Read or Read and write
 * and an X to remove it. "Grant a product" adds a row to choose another of
 * the owner's products and the access to give it, finalized with Grant. Each
 * title opens the product in a new tab, so a manager can check what it holds.
 *
 * The create form and the account's page use the same list. The form holds
 * the grants until it is submitted; the page saves each as it is made. The
 * stories hold them in state, so every control can be used.
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

/** Nothing granted yet, as a new service account starts. */
export const NothingGranted: Story = {};

/** An account that writes one product and reads another; one is left to grant. */
export const SomeGranted: Story = {
  args: {
    access: {
      "climate-data": MembershipRole.WriteData as ProductAccess,
      "reference-data": MembershipRole.ReadData as ProductAccess,
    },
  },
};

/** Every product granted: there is nothing left to add. */
export const EverythingGranted: Story = {
  args: {
    access: {
      "climate-data": MembershipRole.WriteData as ProductAccess,
      "reference-data": MembershipRole.ReadData as ProductAccess,
      "field-notes": MembershipRole.ReadData as ProductAccess,
    },
  },
};

/** Held while the account's page saves a change. */
export const Saving: Story = {
  args: { ...SomeGranted.args, disabled: true },
};

/** An owner with no products has nothing to grant. */
export const NoProducts: Story = {
  args: { products: [] },
};
