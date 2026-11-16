import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { S3UploadService } from "./s3-upload";

const config = {
  endpoint: "https://proxy.example",
  bucket: "acct",
  region: "us-east-1",
  prefix: "prod/",
  credentials: async () => ({ accessKeyId: "k", secretAccessKey: "s" }),
};

/** Replace the service's S3 clients with stubbed send()s. */
function withStub(svc: S3UploadService, send: jest.Mock, batchSend = send) {
  const internals = svc as unknown as Record<string, { send: jest.Mock }>;
  internals.client = { send };
  internals.batchClient = { send: batchSend };
}

/** A two-page listing of prod/dir/{a,b,c}. */
const listTwoPages = (cmd: ListObjectsV2Command) =>
  cmd.input.ContinuationToken
    ? { Contents: [{ Key: "prod/dir/c" }], IsTruncated: false }
    : {
        Contents: [{ Key: "prod/dir/a" }, { Key: "prod/dir/b" }],
        IsTruncated: true,
        NextContinuationToken: "next",
      };

describe("S3UploadService delete", () => {
  it("deleteObject deletes the prefixed key", async () => {
    const send = jest.fn().mockResolvedValue({});
    const svc = new S3UploadService(config);
    withStub(svc, send);

    await svc.deleteObject("dir/file.txt");

    expect(send).toHaveBeenCalledTimes(1);
    const cmd = send.mock.calls[0][0] as DeleteObjectCommand;
    expect(cmd).toBeInstanceOf(DeleteObjectCommand);
    expect(cmd.input).toMatchObject({
      Bucket: "acct",
      Key: "prod/dir/file.txt",
    });
  });

  it("builds the batch client at /{account}, so the product is the bucket", async () => {
    const svc = new S3UploadService(config);
    const batchClient = (
      svc as unknown as {
        batchClient: { config: { endpoint: () => Promise<{ path: string }> } };
      }
    ).batchClient;
    expect((await batchClient.config.endpoint()).path).toBe("/acct");
  });

  it("deletePrefix lists everything, then batch-deletes product-relative keys", async () => {
    const send = jest.fn().mockImplementation(async (cmd) => listTwoPages(cmd));
    const batchSend = jest.fn().mockResolvedValue({});
    const svc = new S3UploadService(config);
    withStub(svc, send, batchSend);
    const progress = jest.fn();

    await svc.deletePrefix("dir/", progress);

    const lists = send.mock.calls.map((c) => c[0]);
    expect(lists).toHaveLength(2);
    expect(lists[0].input).toMatchObject({ Prefix: "prod/dir/" });
    expect(lists[1].input).toMatchObject({ ContinuationToken: "next" });

    expect(batchSend).toHaveBeenCalledTimes(1);
    const batch = batchSend.mock.calls[0][0] as DeleteObjectsCommand;
    expect(batch).toBeInstanceOf(DeleteObjectsCommand);
    expect(batch.input.Bucket).toBe("prod");
    expect(batch.input.Delete?.Objects).toEqual([
      { Key: "dir/a" },
      { Key: "dir/b" },
      { Key: "dir/c" },
    ]);

    expect(progress.mock.calls.map((c) => c[0])).toEqual([
      { deleted: 0, total: 2, counting: true },
      { deleted: 0, total: 3, counting: true },
      { deleted: 0, total: 3, counting: false },
      { deleted: 3, total: 3, counting: false },
    ]);
  });

  it("falls back to per-object deletes when the backend rejects the batch", async () => {
    const send = jest
      .fn()
      .mockImplementation(async (cmd) =>
        cmd instanceof ListObjectsV2Command ? listTwoPages(cmd) : {}
      );
    const batchSend = jest.fn().mockRejectedValue(new Error("NotImplemented"));
    const svc = new S3UploadService(config);
    withStub(svc, send, batchSend);
    jest.spyOn(console, "warn").mockImplementation(() => {});

    await svc.deletePrefix("dir/");
    await svc.deletePrefix("dir/");

    // Tried once, then remembered: the second call goes straight per-object.
    expect(batchSend).toHaveBeenCalledTimes(1);
    const deleted = send.mock.calls
      .map((c) => c[0])
      .filter((c) => c instanceof DeleteObjectCommand)
      .map((c) => c.input.Key);
    expect(deleted).toEqual([
      "prod/dir/a",
      "prod/dir/b",
      "prod/dir/c",
      "prod/dir/a",
      "prod/dir/b",
      "prod/dir/c",
    ]);
  });

  it("throws when some keys in a batch fail", async () => {
    const send = jest.fn().mockImplementation(async (cmd) => listTwoPages(cmd));
    const batchSend = jest.fn().mockResolvedValue({
      Errors: [
        { Key: "dir/b", Code: "AccessDenied", Message: "Access Denied" },
      ],
    });
    const svc = new S3UploadService(config);
    withStub(svc, send, batchSend);

    await expect(svc.deletePrefix("dir/")).rejects.toThrow(
      "1 objects could not be deleted (AccessDenied: Access Denied)"
    );
  });

  it("deletePrefix issues no delete for an empty prefix", async () => {
    const send = jest
      .fn()
      .mockResolvedValueOnce({ Contents: [], IsTruncated: false });
    const batchSend = jest.fn();
    const svc = new S3UploadService(config);
    withStub(svc, send, batchSend);

    await svc.deletePrefix("empty/");

    expect(send).toHaveBeenCalledTimes(1); // list only
    expect(batchSend).not.toHaveBeenCalled();
  });
});
