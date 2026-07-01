import { UploadQueueManager } from "./upload-queue-manager";
import type { S3UploadService } from "./s3-upload";

const scope = { accountId: "acc", productId: "prod" };

function makeS3Service(): S3UploadService {
  return {
    uploadFile: jest.fn().mockResolvedValue({
      upload: {},
      result: Promise.resolve({ key: "" }),
    }),
  } as unknown as S3UploadService;
}

describe("UploadQueueManager", () => {
  it("rejects filenames with characters that break the storage proxy's signature check", () => {
    const manager = new UploadQueueManager(2);
    const s3Service = makeS3Service();
    const file = new File(["x"], "test().txt");

    manager.add([file], "", scope, s3Service);

    const [item] = manager.getAll();
    expect(item.status).toBe("error");
    expect(item.error).toMatch(/Unsupported character/);
    expect(s3Service.uploadFile).not.toHaveBeenCalled();
  });

  it("uploads filenames without unsupported characters", async () => {
    const manager = new UploadQueueManager(2);
    const s3Service = makeS3Service();
    const file = new File(["x"], "test.txt");

    manager.add([file], "", scope, s3Service);

    expect(s3Service.uploadFile).toHaveBeenCalled();
  });

  it("rejects filenames with spaces", () => {
    const manager = new UploadQueueManager(2);
    const s3Service = makeS3Service();
    const file = new File(["x"], "catalog 1.jsonl");

    manager.add([file], "", scope, s3Service);

    const [item] = manager.getAll();
    expect(item.status).toBe("error");
    expect(item.error).toMatch(/Unsupported character space/);
    expect(s3Service.uploadFile).not.toHaveBeenCalled();
  });

  it("removes a single item from the queue", () => {
    const manager = new UploadQueueManager(2);
    const s3Service = makeS3Service();
    const file = new File(["x"], "test().txt");

    manager.add([file], "", scope, s3Service);
    const [item] = manager.getAll();
    manager.remove(item.id);

    expect(manager.getAll()).toHaveLength(0);
  });
});
