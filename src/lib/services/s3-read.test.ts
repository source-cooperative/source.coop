/**
 * @jest-environment node
 */
import { S3ReadClient } from "./s3-read";

const mockSend = jest.fn();

jest.mock("@aws-sdk/client-s3", () => {
  const actual = jest.requireActual("@aws-sdk/client-s3");
  return {
    ...actual,
    S3Client: jest.fn().mockImplementation(() => ({ send: mockSend })),
  };
});

import { S3Client } from "@aws-sdk/client-s3";

describe("S3ReadClient", () => {
  beforeEach(() => { mockSend.mockReset(); (S3Client as jest.Mock).mockClear(); });

  test("uses no-op signer when no credentials", () => {
    new S3ReadClient({ endpoint: "https://data.source.coop" });
    const config = (S3Client as jest.Mock).mock.calls[0][0];
    expect(config.signer).toBeDefined();
    expect(config.forcePathStyle).toBe(true);
  });

  test("uses credentials when provided", () => {
    new S3ReadClient({ endpoint: "https://data.source.coop", credentials: { accessKeyId: "A", secretAccessKey: "S", sessionToken: "T", expiration: "2026-04-10T13:00:00Z" } });
    const config = (S3Client as jest.Mock).mock.calls[0][0];
    expect(config.credentials).toMatchObject({ accessKeyId: "A", secretAccessKey: "S", sessionToken: "T" });
    expect(config.signer).toBeUndefined();
  });

  test("listObjects parses response", async () => {
    mockSend.mockResolvedValue({
      Contents: [{ Key: "a/p/file.txt", Size: 42, ETag: '"abc"', LastModified: new Date("2026-04-10") }],
      CommonPrefixes: [{ Prefix: "a/p/subdir/" }],
      IsTruncated: false,
    });
    const client = new S3ReadClient({ endpoint: "https://data.source.coop" });
    const result = await client.listObjects({ bucket: "a", prefix: "p/" });
    expect(result.objects).toHaveLength(1);
    expect(result.objects[0]).toMatchObject({ key: "a/p/file.txt", size: 42 });
    expect(result.directories).toEqual(["a/p/subdir/"]);
  });
});
