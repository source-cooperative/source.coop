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

import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

describe("S3ReadClient", () => {
  beforeEach(() => {
    mockSend.mockReset();
    (S3Client as jest.Mock).mockClear();
  });

  test("uses no-auth scheme when no credentials", async () => {
    new S3ReadClient({ endpoint: "https://data.source.coop" });
    const config = (S3Client as jest.Mock).mock.calls[0][0];
    expect(config.forcePathStyle).toBe(true);
    expect(config.credentials).toBeUndefined();
    expect(config.httpAuthSchemes).toHaveLength(1);
    expect(config.httpAuthSchemes[0].schemeId).toBe("aws.auth#sigv4");
    expect(typeof config.httpAuthSchemes[0].signer.sign).toBe("function");
    // The no-auth identity provider must resolve to an empty identity so the
    // SDK's credential middleware doesn't reject before signing.
    const identity = await config.httpAuthSchemes[0].identityProvider()();
    expect(identity).toEqual({});
  });

  test("uses credentials when provided", () => {
    new S3ReadClient({ endpoint: "https://data.source.coop", credentials: { accessKeyId: "A", secretAccessKey: "S", sessionToken: "T", expiration: "2026-04-10T13:00:00Z" } });
    const config = (S3Client as jest.Mock).mock.calls[0][0];
    expect(config.credentials).toMatchObject({ accessKeyId: "A", secretAccessKey: "S", sessionToken: "T" });
    expect(config.httpAuthSchemes).toBeUndefined();
  });

  test("listObjects parses response and builds the command", async () => {
    mockSend.mockResolvedValue({
      Contents: [{ Key: "a/p/file.txt", Size: 42, ETag: '"abc"', LastModified: new Date("2026-04-10") }],
      CommonPrefixes: [{ Prefix: "a/p/subdir/" }],
      IsTruncated: false,
    });
    const client = new S3ReadClient({ endpoint: "https://data.source.coop" });
    const result = await client.listObjects({
      bucket: "a",
      prefix: "p/",
      continuationToken: "tok-in",
      maxKeys: 10,
    });

    // The command must be constructed with the expected input — otherwise a
    // wrong bucket/prefix/delimiter could regress while parsing still passes.
    const command = mockSend.mock.calls[0][0];
    expect(command).toBeInstanceOf(ListObjectsV2Command);
    expect(command.input).toMatchObject({
      Bucket: "a",
      Prefix: "p/",
      Delimiter: "/",
      ContinuationToken: "tok-in",
      MaxKeys: 10,
    });

    expect(result.objects).toHaveLength(1);
    expect(result.objects[0]).toMatchObject({ key: "a/p/file.txt", size: 42 });
    expect(result.directories).toEqual(["a/p/subdir/"]);
    expect(result.isTruncated).toBe(false);
    expect(result.nextContinuationToken).toBeUndefined();
  });

  test("listObjects surfaces pagination fields when truncated", async () => {
    mockSend.mockResolvedValue({
      Contents: [],
      CommonPrefixes: [],
      IsTruncated: true,
      NextContinuationToken: "tok-next",
    });
    const client = new S3ReadClient({ endpoint: "https://data.source.coop" });
    const result = await client.listObjects({ bucket: "a", prefix: "p/" });

    expect(result.isTruncated).toBe(true);
    expect(result.nextContinuationToken).toBe("tok-next");
  });
});
