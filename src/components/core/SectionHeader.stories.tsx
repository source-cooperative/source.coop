import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button, Card, Flex, Text, TextField } from "@radix-ui/themes";
import { SectionHeader } from "./SectionHeader";

/**
 * How a long form is broken into readable blocks: a bold label, a rule, and
 * whatever the section contains.
 *
 * The `color` prop carries the whole header, rule included — a grey rule under
 * a red heading reads as the section having stopped being dangerous halfway
 * down. Compare Default with Danger.
 */
const meta = {
  title: "Components/Layout/SectionHeader",
  component: SectionHeader,
  parameters: { layout: "padded" },
} satisfies Meta<typeof SectionHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: "Identity",
    children: (
      <Flex direction="column" gap="2">
        <TextField.Root size="3" placeholder="Connection name" />
      </Flex>
    ),
  },
};

export const WithDescription: Story = {
  args: {
    title: "Key layout",
    description: "Where a product's objects land inside the bucket.",
    children: (
      <TextField.Root size="3" placeholder="{{repository.account_id}}/" />
    ),
  },
};

export const WithRightButton: Story = {
  args: {
    title: "Data connections",
    rightButton: <Button size="1">New connection</Button>,
    children: (
      <Text size="2" color="gray">
        Two connections.
      </Text>
    ),
  },
};

/** Red throughout, which is how <DangerZone> is built. */
export const Danger: Story = {
  args: {
    title: "Danger zone",
    color: "red",
    children: (
      <Text size="2" color="gray">
        Irreversible actions live here.
      </Text>
    ),
  },
};

/**
 * Consecutive sections have to read as separate blocks rather than one
 * continuous column of fields — and the space between them belongs to the
 * caller, not to this component.
 *
 * SectionHeader carries no margin of its own precisely because it is also the
 * sole child of a Card in several places (ProductMetaCard, UsageCard, the
 * product layout's Contents), where a top margin would push the heading off the
 * top of its card. A form stacking sections sets a wrapper gap instead, as
 * here.
 */
export const Consecutive: Story = {
  args: { title: "Identity" },
  render: () => (
    <Flex direction="column" gap="6">
      <SectionHeader title="Identity">
        <TextField.Root size="3" placeholder="Connection name" />
      </SectionHeader>
      <SectionHeader title="Backend">
        <TextField.Root size="3" placeholder="Bucket" />
      </SectionHeader>
      <SectionHeader title="Policy">
        <TextField.Root size="3" placeholder="Required flag" />
      </SectionHeader>
    </Flex>
  ),
};

/**
 * The other context: alone inside a Card, where the heading has to sit flush at
 * the top. This is the case a margin on SectionHeader itself would break.
 */
export const InsideACard: Story = {
  args: { title: "Details" },
  render: () => (
    <Card size={{ initial: "2", sm: "1" }}>
      <SectionHeader title="Details">
        <Text size="2" color="gray">
          Nothing above the heading — the card edge is the boundary.
        </Text>
      </SectionHeader>
    </Card>
  ),
};
