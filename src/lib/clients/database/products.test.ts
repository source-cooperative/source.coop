import { ProductsTable } from "./products";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import type { Product } from "@/types";

// Mock CONFIG so BaseTable can construct table name
jest.mock("@/lib/config", () => ({
  CONFIG: {
    environment: { stage: "test" },
    database: {},
  },
}));

jest.mock("@/lib/logging", () => ({
  LOGGER: { error: jest.fn(), info: jest.fn() },
}));

jest.mock("./accounts", () => ({
  accountsTable: {
    fetchById: jest.fn().mockResolvedValue(null),
    fetchManyByIds: jest.fn().mockResolvedValue([]),
  },
}));

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    account_id: "kerner-lab",
    product_id: "fields-of-the-world",
    title: "Fields of the World (FTW)",
    description: "A global benchmark dataset for field boundary delineation",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    visibility: "public",
    disabled: false,
    featured: 5,
    metadata: { tags: [], mirrors: {}, primary_mirror: "test" },
    ...overrides,
  } as Product;
}

describe("ProductsTable search", () => {
  let mockSend: jest.Mock;
  let table: InstanceType<typeof ProductsTable>;

  beforeEach(() => {
    mockSend = jest.fn();
    const mockClient = { send: mockSend } as unknown as DynamoDBDocumentClient;
    table = new ProductsTable({ client: mockClient });
  });

  describe("buildSearchText via create", () => {
    it("stores a lowercased search_text field when creating a product", async () => {
      mockSend.mockResolvedValue({});

      const product = makeProduct({
        title: "Fields of the World (FTW)",
        description: "A Global BENCHMARK Dataset",
      });

      await table.create(product);

      const putCommand = mockSend.mock.calls[0][0];
      const item = putCommand.input.Item;
      expect(item.search_text).toBeDefined();
      expect(item.search_text).toBe(item.search_text.toLowerCase());
      expect(item.search_text).toContain("ftw");
      expect(item.search_text).toContain("fields of the world");
      expect(item.search_text).toContain("kerner-lab");
      expect(item.search_text).toContain("fields-of-the-world");
    });
  });

  describe("buildSearchText via update", () => {
    it("stores a lowercased search_text field when updating a product", async () => {
      mockSend.mockResolvedValue({ Attributes: makeProduct() });

      const product = makeProduct({
        title: "Fields of the World (FTW)",
        description: "UPPERCASE DESCRIPTION",
      });

      await table.update(product);

      const updateCommand = mockSend.mock.calls[0][0];
      const values = updateCommand.input.ExpressionAttributeValues;
      expect(values[":search_text"]).toBeDefined();
      expect(values[":search_text"]).toBe(
        values[":search_text"].toLowerCase()
      );
      expect(values[":search_text"]).toContain("ftw");
      expect(values[":search_text"]).toContain("uppercase description");
    });
  });

  describe("listPublic search filtering", () => {
    it("queries against the search_text field with lowercased input", async () => {
      mockSend.mockResolvedValue({ Items: [], LastEvaluatedKey: undefined });

      await table.listPublic(20, undefined, { search: "FTW" });

      const queryCommand = mockSend.mock.calls[0][0];
      const input = queryCommand.input;
      expect(input.FilterExpression).toContain("search_text");
      expect(input.ExpressionAttributeValues[":search"]).toBe("ftw");
    });

    it("finds products when search term differs in case from title", async () => {
      // Simulate DynamoDB returning a product that has search_text populated
      const product = makeProduct({
        title: "Fields of the World (FTW)",
      });
      const productWithSearchText = {
        ...product,
        search_text: "fields of the world (ftw) a global benchmark dataset for field boundary delineation kerner-lab fields-of-the-world",
      };

      mockSend.mockResolvedValue({
        Items: [productWithSearchText],
        LastEvaluatedKey: undefined,
      });

      const result = await table.listPublic(20, undefined, { search: "ftw" });
      expect(result.products).toHaveLength(1);
      expect(result.products[0].title).toBe("Fields of the World (FTW)");
    });
  });
});
