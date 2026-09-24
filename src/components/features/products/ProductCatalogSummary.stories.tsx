import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Box, Card, Flex, Heading, Text } from "@radix-ui/themes";
import { SectionHeader } from "@/components/core/SectionHeader";
import { ProductCatalogStats } from "./ProductCatalogStats";

const meta = {
  title: "Features/Products/ProductCatalogSummary",
  component: ProductCatalogStats,
  parameters: { layout: "padded" },
  render: (args) => (
    <Flex direction="column" gap="4">
      <Box px={{ initial: "4", md: "0" }}>
        <Heading size="6">Global land cover</Heading>
        <Text as="p" color="gray">Annual land cover observations for research and analysis.</Text>
      </Box>
      <ProductCatalogStats {...args} px={{ initial: "4", md: "0" }} />
      <Card>
        <SectionHeader title="Contents" />
        <Text as="p">land-cover.tif</Text>
        <Text as="p">observations.parquet</Text>
        <Text as="p">README.md</Text>
      </Card>
    </Flex>
  ),
} satisfies Meta<typeof ProductCatalogStats>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AboveContents: Story = {
  args: {
    entry: {
      account_id: "example",
      product_id: "land-cover",
      total_bytes: 12345678900,
      object_count: 12500,
      exts: { tif: 10000, parquet: 2000, json: 400, csv: 100 },
    },
  },
};

export const Missing: Story = {};
export const WithoutStatistics: Story = {
  args: { entry: { account_id: "example", product_id: "land-cover" } },
};
export const Mobile: Story = {
  ...AboveContents,
  globals: { viewport: { value: "mobile1", isRotated: false } },
};
