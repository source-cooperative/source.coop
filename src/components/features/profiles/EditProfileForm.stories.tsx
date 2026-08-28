import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { EditProfileForm } from "./EditProfileForm";
import type { Account } from "@/types";

/**
 * The account profile form, for an individual and for an organization — the
 * fields differ, which is most of what this story is for (ORCID for a person,
 * ROR for an institution).
 *
 * `updateAccountProfile` is an `fn()` stub, so saving does nothing.
 */
const meta = {
  title: "Features/Profiles/EditProfileForm",
  component: EditProfileForm,
  parameters: { layout: "padded" },
} satisfies Meta<typeof EditProfileForm>;

export default meta;
type Story = StoryObj<typeof meta>;

const individual = {
  account_id: "acoltrane",
  name: "Alice Coltrane",
  type: "individual",
  emails: [{ address: "chris@example.test", is_primary: true, verified: true }],
  metadata_public: {
    bio: "Works on open ocean-acoustics data and cloud-native infrastructure.",
    orcid: "0000-0002-1825-0097",
    websites: ["https://acoltrane.org"],
  },
} as unknown as Account;

const organization = {
  account_id: "miskatonic",
  name: "Miskatonic University",
  type: "organization",
  metadata_public: {
    bio: "Deep-ocean acoustics and abyssal survey data.",
    ror_id: "https://ror.org/04t0dxa17",
    websites: ["https://miskatonic.edu"],
  },
} as unknown as Account;

export const Individual: Story = {
  args: { account: individual },
};

export const Organization: Story = {
  args: { account: organization },
};

/** A new account with nothing filled in yet. */
export const Empty: Story = {
  args: {
    account: {
      account_id: "newcomer",
      name: "",
      type: "individual",
      metadata_public: {},
    } as unknown as Account,
  },
};
