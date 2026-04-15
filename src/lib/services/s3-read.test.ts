/**
 * @jest-environment node
 */
import { S3ReadClient } from "./s3-read";

const mockSend = jest.fn();

jest.mock("@aws-sdk/client-s3", () => {
  const actual = jest.requireActual("@aws-sdk/client-s3");
  return {
    ...actual,
    S3Client: jest.fn().mockImplementation(() => ({
      send: mockSend,
    })),
  };
});

import { S3Client } from "@aws-sdk/client-s3";

describe("S3ReadClient", () => {
  beforeEach(() => {
    mockSend.mockReset();
    (S3Client as jest.Mock).mockClear();
  });

  test("constructs an unsigned client when no credentials provided", () => {
    new S3ReadClient({ endpoint: "https://data.source.coop" });
    expect(S3Client).toHaveBeenCalledTimes(1);
    const config = (S3Client as jest.Mock).mock.calls[0][0];
    expect(config.endpoint).toBe("https://data.source.coop");
    expect(config.forcePathStyle).toBe(true);
    expect(config.signer).toBeDefined();
  });

  test("constructs a signed client when credentials provided", () => {
    new S3ReadClient({
      endpoint: "https://data.source.coop",
      credentials: {
        accessKeyId: "AKIA",
        secretAccessKey: "secret",
        sessionToken: "sess",
        expiration: "2026-04-10T13:00:00Z",
      },
    });
    const config = (S3Client as jest.Mock).mock.calls[0][0];
    expect(config.credentials).toMatchObject({
      accessKeyId: "AKIA",
      secretAccessKey: "secret",
      sessionToken: "sess",
    });
    expect(config.signer).toBeUndefined();
  });

  test("listObjects forwards prefix and parses response", async () => {
    mockSend.mockResolvedValue({
      Contents: [
        { Key: "account/product/file.txt", Size: 42, ETag: '"abc"', LastModified: new Date("2026-04-10") },
      ],
      CommonPrefixes: [{ Prefix: "account/product/subdir/" }],
      IsTruncated: false,
    });

    const client = new S3ReadClient({ endpoint: "https://data.source.coop" });
    const result = await client.listObjects({
      bucket: "account",
      prefix: "product/",
    });

    expect(result.objects).toHaveLength(1);
    expect(result.objects[0]).toMatchObject({
      key: "account/product/file.txt",
      size: 42,
    });
    expect(result.directories).toEqual(["account/product/subdir/"]);
  });
});
