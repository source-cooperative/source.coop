import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { userEvent, within } from "storybook/test";
import { AccountDropdown } from "./AccountDropdown";
import { S3CredentialsProvider } from "@/components/features/uploader/CredentialsProvider";
import { UploadProvider } from "@/components/features/uploader/UploadProvider";
import {
  type Account,
  AccountFlags,
  AccountType,
  type UserSession,
} from "@/types";

/**
 * The account menu at the right of the header, opened from your avatar and
 * name. It lists you and the organizations you belong to, each with its
 * products, and then your invitations and, for admins, the admin tools.
 *
 * A red dot on the avatar means something is waiting for you: an invitation
 * to accept or, for an admin, suggested tags to review. A matching dot marks
 * where in the menu to find it.
 */
const meta = {
  title: "Features/App shell/AccountDropdown",
  component: AccountDropdown,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <S3CredentialsProvider>
        <UploadProvider>
          <Story />
        </UploadProvider>
      </S3CredentialsProvider>
    ),
  ],
} satisfies Meta<typeof AccountDropdown>;

export default meta;
type Story = StoryObj<typeof meta>;

const alice = {
  account_id: "acoltrane",
  name: "Alice Coltrane",
  type: AccountType.INDIVIDUAL,
  flags: [AccountFlags.CREATE_REPOSITORIES],
  disabled: false,
  created_at: "2026-03-12T00:00:00Z",
  updated_at: "2026-03-12T00:00:00Z",
} as unknown as Account;

const session = (flags: AccountFlags[]) =>
  ({
    identity_id: "identity-1",
    account: { ...alice, flags },
    memberships: [],
  }) as unknown as UserSession;

const accounts = [
  {
    account: alice,
    isSelf: true,
    products: [{ product_id: "abyssal-acoustics", title: "Abyssal Acoustics" }],
  },
];

const openMenu = async (canvasElement: HTMLElement) =>
  userEvent.click(within(canvasElement).getByText("Alice Coltrane"));

/** Nothing waiting: no dot. */
export const Default: Story = {
  args: { session: session([]), accounts },
};

/** An invitation to join an organization puts a dot on the avatar and on Invitations. */
export const Invited: Story = {
  args: {
    session: session([]),
    accounts,
    pendingInvitations: [{ href: "/miskatonic", label: "Miskatonic University" }],
  },
  play: ({ canvasElement }) => openMenu(canvasElement),
};

/**
 * Someone has suggested a tag. An admin sees a dot on the avatar, on Admin,
 * and on Tags inside it, which leads to the review queue.
 */
export const TagsToReview: Story = {
  args: {
    session: session([AccountFlags.ADMIN]),
    accounts,
    hasPendingTags: true,
  },
  play: async ({ canvasElement }) => {
    await openMenu(canvasElement);
    await userEvent.hover(within(document.body).getByText("Admin"));
  },
};
