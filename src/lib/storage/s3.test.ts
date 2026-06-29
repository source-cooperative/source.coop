/**
 * @jest-environment node
 */
import { Readable } from "stream";
import { S3StorageClient, isAccessDeniedError } from "./s3";

const mockSend = jest.fn();

jest.mock("@aws-sdk/client-s3", () => {
  const actual = jest.requireActual("@aws-sdk/client-s3");
  return {
    ...actual,
    S3Client: jest.fn().mockImplementation(() => ({ send: mockSend })),
  };
});

import {
  S3Client,
  S3ServiceException,
  ListObjectsV2Command,
  DeleteObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";

describe("S3StorageClient", () => {
  beforeEach(() => {
    mockSend.mockReset();
    (S3Client as jest.Mock).mockClear();
  });

  test("uses no-auth scheme when no credentials", async () => {
    new S3StorageClient({ endpoint: "https://data.source.coop" });
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
    new S3StorageClient({
      endpoint: "https://data.source.coop",
      credentials: {
        accessKeyId: "A",
        secretAccessKey: "S",
        sessionToken: "T",
        expiration: "2026-04-10T13:00:00Z",
      },
    });
    const config = (S3Client as jest.Mock).mock.calls[0][0];
    expect(config.credentials).toMatchObject({
      accessKeyId: "A",
      secretAccessKey: "S",
      sessionToken: "T",
    });
    expect(config.httpAuthSchemes).toBeUndefined();
  });

  test("listObjects parses response and builds the command", async () => {
    mockSend.mockResolvedValue({
      Contents: [
        {
          Key: "a/p/file.txt",
          Size: 42,
          ETag: '"abc"',
          LastModified: new Date("2026-04-10"),
        },
      ],
      CommonPrefixes: [{ Prefix: "a/p/subdir/" }],
      IsTruncated: false,
    });
    const client = new S3StorageClient({ endpoint: "https://data.source.coop" });
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
    const client = new S3StorageClient({ endpoint: "https://data.source.coop" });
    const result = await client.listObjects({ bucket: "a", prefix: "p/" });

    expect(result.isTruncated).toBe(true);
    expect(result.nextContinuationToken).toBe("tok-next");
  });

  test("getObjectInfo returns a ProductObject on a successful HEAD", async () => {
    mockSend.mockResolvedValue({
      ContentLength: 123,
      ContentType: "text/plain",
      ETag: '"abc"',
      LastModified: new Date("2026-04-10"),
      Metadata: { foo: "bar" },
    });
    const client = new S3StorageClient({ endpoint: "https://data.source.coop" });
    const result = await client.getObjectInfo({
      account_id: "acct",
      product_id: "prod",
      object_path: "dir/file.txt",
    });

    const command = mockSend.mock.calls[0][0];
    expect(command).toBeInstanceOf(HeadObjectCommand);
    expect(command.input).toMatchObject({
      Bucket: "acct",
      Key: "prod/dir/file.txt",
    });

    expect(result).toMatchObject({
      id: "dir/file.txt",
      product_id: "prod",
      path: "dir/file.txt",
      type: "file",
      size: 123,
      mime_type: "text/plain",
      checksum: '"abc"',
    });
  });

  test("getObjectInfo returns null on a NotFound S3ServiceException", async () => {
    const actual = jest.requireActual("@aws-sdk/client-s3");
    const notFound = new actual.S3ServiceException({
      name: "NotFound",
      $fault: "client",
      $metadata: {},
    });
    mockSend.mockRejectedValue(notFound);

    const client = new S3StorageClient({ endpoint: "https://data.source.coop" });
    const result = await client.getObjectInfo({
      account_id: "acct",
      product_id: "prod",
      object_path: "missing.txt",
    });
    expect(result).toBeNull();
  });

  test("getObjectInfo re-throws on a non-NotFound error", async () => {
    const boom = new Error("boom");
    mockSend.mockRejectedValue(boom);

    const client = new S3StorageClient({ endpoint: "https://data.source.coop" });
    await expect(
      client.getObjectInfo({
        account_id: "acct",
        product_id: "prod",
        object_path: "file.txt",
      }),
    ).rejects.toThrow("boom");
  });

  test("headObject maps response fields", async () => {
    mockSend.mockResolvedValue({
      ContentLength: 456,
      ContentType: "application/json",
      ETag: '"def"',
      VersionId: "v1",
      Metadata: { k: "v" },
    });
    const client = new S3StorageClient({ endpoint: "https://data.source.coop" });
    const result = await client.headObject({
      account_id: "acct",
      product_id: "prod",
      object_path: "dir/file.json",
    });

    const command = mockSend.mock.calls[0][0];
    expect(command).toBeInstanceOf(HeadObjectCommand);
    expect(command.input).toMatchObject({
      Bucket: "acct",
      Key: "prod/dir/file.json",
    });

    expect(result.contentLength).toBe(456);
    expect(result.contentType).toBe("application/json");
    expect(result.etag).toBe('"def"');
    expect(result.versionId).toBe("v1");
  });

  test("getObject buffers the Body and returns data and contentType", async () => {
    const bytes = Buffer.from("hello world");
    mockSend.mockResolvedValue({
      Body: Readable.from([bytes]),
      ContentType: "text/plain",
      ETag: '"ghi"',
      LastModified: new Date("2026-04-10"),
      Metadata: {},
    });
    const client = new S3StorageClient({ endpoint: "https://data.source.coop" });
    const result = await client.getObject({
      account_id: "acct",
      product_id: "prod",
      object_path: "dir/file.txt",
    });

    const command = mockSend.mock.calls[0][0];
    expect(command).toBeInstanceOf(GetObjectCommand);
    expect(command.input).toMatchObject({
      Bucket: "acct",
      Key: "prod/dir/file.txt",
    });

    expect(Buffer.isBuffer(result.data)).toBe(true);
    expect((result.data as Buffer).equals(bytes)).toBe(true);
    expect(result.contentType).toBe("text/plain");
    expect(result.contentLength).toBe(bytes.length);
    expect(result.etag).toBe('"ghi"');
  });

  test("deleteByPrefix pages through the listing and deletes each object individually", async () => {
    mockSend
      .mockResolvedValueOnce({
        Contents: [{ Key: "p/a" }, { Key: "p/b" }],
        IsTruncated: true,
        NextContinuationToken: "t2",
      })
      .mockResolvedValueOnce({}) // delete p/a
      .mockResolvedValueOnce({}) // delete p/b
      .mockResolvedValueOnce({ Contents: [{ Key: "p/c" }], IsTruncated: false })
      .mockResolvedValueOnce({}); // delete p/c

    const client = new S3StorageClient({ endpoint: "https://data.source.coop" });
    await client.deleteByPrefix("alice", "p/");

    const commands = mockSend.mock.calls.map((c) => c[0]);
    // Each object is removed with its own DeleteObjectCommand (full key path),
    // not a single batch DeleteObjects.
    const deletedKeys = commands
      .filter((cmd) => cmd instanceof DeleteObjectCommand)
      .map((cmd) => cmd.input.Key);
    expect(deletedKeys).toEqual(["p/a", "p/b", "p/c"]);
    const lists = commands.filter((cmd) => cmd instanceof ListObjectsV2Command);
    expect(lists[1].input.ContinuationToken).toBe("t2");
  });

  test("deleteByPrefix throws (with a sample reason) when an object delete fails", async () => {
    mockSend
      .mockResolvedValueOnce({ Contents: [{ Key: "p/a" }], IsTruncated: false })
      .mockRejectedValueOnce(new Error("bucket not found: alice"));

    const client = new S3StorageClient({ endpoint: "https://data.source.coop" });
    await expect(client.deleteByPrefix("alice", "p/")).rejects.toThrow(
      /Failed to delete 1 object\(s\): bucket not found: alice/,
    );
  });

  test("deleteByPrefix issues no delete when nothing matches the prefix", async () => {
    mockSend.mockResolvedValueOnce({ Contents: [], IsTruncated: false });

    const client = new S3StorageClient({ endpoint: "https://data.source.coop" });
    await client.deleteByPrefix("alice", "p/");

    const deletes = mockSend.mock.calls
      .map((c) => c[0])
      .filter((cmd) => cmd instanceof DeleteObjectCommand);
    expect(deletes).toHaveLength(0);
  });
});

describe("isAccessDeniedError", () => {
  const makeS3Error = (name: string, httpStatusCode?: number) =>
    new S3ServiceException({
      name,
      $fault: "client",
      $metadata: httpStatusCode ? { httpStatusCode } : {},
    } as ConstructorParameters<typeof S3ServiceException>[0]);

  test("true for AccessDenied by name", () => {
    expect(isAccessDeniedError(makeS3Error("AccessDenied"))).toBe(true);
  });

  test("true for a 403 even when the name differs", () => {
    expect(isAccessDeniedError(makeS3Error("Forbidden", 403))).toBe(true);
  });

  test("false for other S3 errors (e.g. NotFound/404)", () => {
    expect(isAccessDeniedError(makeS3Error("NotFound", 404))).toBe(false);
  });

  test("false for non-S3 errors and non-errors", () => {
    expect(isAccessDeniedError(new Error("AccessDenied"))).toBe(false);
    expect(isAccessDeniedError("AccessDenied")).toBe(false);
    expect(isAccessDeniedError(null)).toBe(false);
  });
});
