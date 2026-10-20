import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { userEvent, within } from "storybook/test";
import { AccountType } from "@/types";
import { AdminUserLookup } from "./AdminUserLookup";

/**
 * The admin user-lookup tool. Typing is debounced into the URL's `q` param and
 * the page searches on the server, so the results always match the address
 * bar. Each match is a card linking to that profile, under a line saying which
 * system answered: an email is resolved through Ory to one identity, anything
 * else is matched against handles and display names in the database, disabled
 * accounts included.
 */
const meta = {
  title: "Features/Admin/AdminUserLookup",
  component: AdminUserLookup,
  parameters: { layout: "padded" },
} satisfies Meta<typeof AdminUserLookup>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Before anything has been typed: just the search box. */
export const Empty: Story = {
  args: { query: "" },
};

/** A name fragment matched in the database; a disabled account is flagged. */
export const DatabaseMatches: Story = {
  args: {
    query: "jan",
    search: {
      source: "database",
      results: [
        {
          account_id: "jane-doe",
          name: "Jane Doe",
          type: AccountType.INDIVIDUAL,
        },
        {
          account_id: "janis",
          name: "Janis Joplin",
          type: AccountType.INDIVIDUAL,
          profile_image: "https://i.pravatar.cc/80?u=janis",
        },
        {
          account_id: "janitor",
          name: "Jan Retired",
          type: AccountType.INDIVIDUAL,
          disabled: true,
        },
      ],
    },
  },
};

/**
 * A search in flight. From the first keystroke that differs from the URL until
 * the page for the new query renders, the field shows a spinner and the
 * results below are dimmed, so the old answer is not mistaken for the new one.
 */
export const Searching: Story = {
  args: DatabaseMatches.args,
  play: async ({ canvasElement }) => {
    await userEvent.type(
      within(canvasElement).getByLabelText("Search users"),
      "e",
    );
  },
};

/** Nothing in the database contains the query. */
export const DatabaseNoMatches: Story = {
  args: { query: "zz-nobody", search: { source: "database", results: [] } },
};

/** An email resolved through Ory to the one account that owns it. */
export const OryMatch: Story = {
  args: {
    query: "jane@example.com",
    search: {
      source: "ory",
      identityFound: true,
      results: [
        {
          account_id: "jane-doe",
          name: "Jane Doe",
          type: AccountType.INDIVIDUAL,
        },
      ],
    },
  },
};

/** Ory knows the email, but the identity never finished creating a profile. */
export const OryIdentityWithoutProfile: Story = {
  args: {
    query: "orphan@example.com",
    search: { source: "ory", identityFound: true, results: [] },
  },
};

/** Ory has never seen the email. */
export const OryNoIdentity: Story = {
  args: {
    query: "nobody@example.com",
    search: { source: "ory", identityFound: false, results: [] },
  },
};
