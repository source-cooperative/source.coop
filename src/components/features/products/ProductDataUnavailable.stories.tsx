import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ProductDataUnavailable } from "./ProductDataUnavailable";

/**
 * Shown when a viewer who *is* authorized still can't read the data — freshly
 * minted credentials that haven't propagated, or a proxy that is down.
 *
 * It degrades in place rather than throwing to the route error boundary, which
 * would blank the whole product. That is the reason it exists and the reason
 * it is hard to see: reproducing it in the app means breaking the data proxy.
 */
const meta = {
  title: "Features/Products/ProductDataUnavailable",
  component: ProductDataUnavailable,
  parameters: { layout: "padded" },
} satisfies Meta<typeof ProductDataUnavailable>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The proxy returned AccessDenied — usually credentials still propagating. */
export const AccessDenied: Story = {};

/** The backend was unreachable, so the contents could not be loaded at all. */
export const BackendUnreachable: Story = {
  args: {
    message:
      "We couldn't reach the storage backend for this product. Try again in a moment.",
  },
};

/**
 * `details` is passed only for viewers who can edit the product — the gating
 * happens server-side, so this is what a maintainer sees and a reader never
 * does.
 */
export const WithMaintainerDetails: Story = {
  args: {
    details:
      "AccessDenied: User: arn:aws:sts::000000000000:assumed-role/source-proxy/session is not authorized to perform: s3:GetObject on resource: arn:aws:s3:::miskatonic-archive/abyssal-acoustics/manifest.json",
  },
};
