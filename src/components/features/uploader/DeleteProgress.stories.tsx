import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Box } from "@radix-ui/themes";
import { DeleteProgress } from "./DeleteProgress";
import type { DeleteJob } from "./UploadProvider";

/**
 * A file or folder delete running in the background, as listed under
 * **Activity** in the account menu.
 *
 * Deleting a folder first counts every object under it, then removes them in
 * batches, so the bar is indeterminate until the count is in and then tracks
 * the share deleted. The delete keeps going while you browse elsewhere in the
 * app; leaving or reloading the tab stops it, and the browser asks first.
 */
const meta = {
  title: "Features/Uploader/DeleteProgress",
  component: DeleteProgress,
  parameters: { layout: "padded" },
  // The account menu's submenu is 320px wide.
  decorators: [
    (Story) => (
      <Box maxWidth="320px">
        <Story />
      </Box>
    ),
  ],
} satisfies Meta<typeof DeleteProgress>;

export default meta;
type Story = StoryObj<typeof meta>;

const job: DeleteJob = {
  id: "1",
  scope: { accountId: "miskatonic", productId: "abyssal-acoustics" },
  path: "recordings/2019/",
  isDirectory: true,
  status: "deleting",
  deleted: 0,
  total: 0,
  counting: true,
};

/** Still listing the folder: the count climbs and the bar has no end yet. */
export const Counting: Story = {
  args: { job: { ...job, total: 12_000 } },
};

/** Counted, and part-way through removing them. */
export const Deleting: Story = {
  args: {
    job: { ...job, counting: false, deleted: 41_000, total: 118_342 },
  },
};

/**
 * Stopped part-way. What's already gone stays gone; the row's delete button
 * runs it again over whatever is left.
 */
export const Failed: Story = {
  args: {
    job: {
      ...job,
      counting: false,
      status: "error",
      deleted: 3_000,
      total: 118_342,
      error:
        "Delete may be partial — 12 objects could not be deleted (AccessDenied: Access Denied). Retry to remove remaining items.",
    },
    onDismiss: () => {},
  },
};

/** A single file is one request: it goes straight to one of one. */
export const SingleFile: Story = {
  args: {
    job: {
      ...job,
      path: "derived/summary.csv",
      isDirectory: false,
      counting: false,
      total: 1,
    },
  },
};
