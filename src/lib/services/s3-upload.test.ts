import {
  DeleteObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { S3UploadService } from "./s3-upload";

const config = {
  endpoint: "https://proxy.example",
  bucket: "acct",
  region: "us-east-1",
  prefix: "prod/",
  accessKeyId: "k",
  secretAccessKey: "s",
  sessionToken: "t",
};

/** Replace the service's internal S3 client with a stubbed send(). */
function withStub(svc: S3UploadService, send: jest.Mock) {
  (svc as unknown as { client: { send: jest.Mock } }).client = { send };
}

describe("S3UploadService delete", () => {
  it("deleteObject deletes the prefixed key", async () => {
    const send = jest.fn().mockResolvedValue({});
    const svc = new S3UploadService(config);
    withStub(svc, send);

    await svc.deleteObject("dir/file.txt");

    expect(send).toHaveBeenCalledTimes(1);
    const cmd = send.mock.calls[0][0] as DeleteObjectCommand;
    expect(cmd).toBeInstanceOf(DeleteObjectCommand);
    expect(cmd.input).toMatchObject({ Bucket: "acct", Key: "prod/dir/file.txt" });
  });

  it("deletePrefix paginates the list and deletes every key per-object", async () => {
    const send = jest.fn().mockImplementation((cmd) => {
      if (cmd instanceof ListObjectsV2Command) {
        // First page truncated, second page final.
        return cmd.input.ContinuationToken
          ? Promise.resolve({ Contents: [{ Key: "prod/dir/c" }], IsTruncated: false })
          : Promise.resolve({
              Contents: [{ Key: "prod/dir/a" }, { Key: "prod/dir/b" }],
              IsTruncated: true,
              NextContinuationToken: "next",
            });
      }
      return Promise.resolve({}); // DeleteObjectCommand
    });

    const svc = new S3UploadService(config);
    withStub(svc, send);

    await svc.deletePrefix("dir/");

    const cmds = send.mock.calls.map((c) => c[0]);
    const lists = cmds.filter((c) => c instanceof ListObjectsV2Command);
    const deletes = cmds.filter((c) => c instanceof DeleteObjectCommand);

    // Two list pages, the second carrying the continuation token.
    expect(lists).toHaveLength(2);
    expect(lists[0].input).toMatchObject({ Prefix: "prod/dir/" });
    expect(lists[1].input).toMatchObject({ ContinuationToken: "next" });

    // Every listed key is deleted with a per-object DeleteObjectCommand —
    // never the bucket-root DeleteObjects the proxy rejects.
    const deletedKeys = deletes.map((d) => d.input.Key);
    expect(deletedKeys).toEqual(["prod/dir/a", "prod/dir/b", "prod/dir/c"]);
  });

  it("deletePrefix issues no delete for an empty page", async () => {
    const send = jest
      .fn()
      .mockResolvedValueOnce({ Contents: [], IsTruncated: false });

    const svc = new S3UploadService(config);
    withStub(svc, send);

    await svc.deletePrefix("empty/");

    expect(send).toHaveBeenCalledTimes(1); // list only, no delete
    expect(send.mock.calls[0][0]).toBeInstanceOf(ListObjectsV2Command);
  });
});
