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
  title: "Profiles/EditProfileForm",
  component: EditProfileForm,
  parameters: { layout: "padded" },
} satisfies Meta<typeof EditProfileForm>;

export default meta;
type Story = StoryObj<typeof meta>;

const individual = {
  account_id: "cholmes",
  name: "Chris Holmes",
  type: "individual",
  emails: [{ address: "chris@example.test", is_primary: true, verified: true }],
  metadata_public: {
    bio: "Works on open geospatial data and cloud-native infrastructure.",
    orcid: "0000-0002-1825-0097",
    websites: ["https://cholmes.org"],
  },
} as unknown as Account;

const organization = {
  account_id: "cascadia-research",
  name: "Cascadia Research",
  type: "organization",
  metadata_public: {
    bio: "Marine mammal research collective.",
    ror_id: "https://ror.org/05gq02987",
    websites: ["https://cascadiaresearch.org"],
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
