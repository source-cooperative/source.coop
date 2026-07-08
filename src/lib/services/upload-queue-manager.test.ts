import { UploadQueueManager } from "./upload-queue-manager";
import type { S3UploadService } from "./s3-upload";
import type { CredentialsScope } from "@/components/features/uploader/CredentialsProvider";

const scope: CredentialsScope = { accountId: "acct", productId: "prod" };

function fakeService(uploadFile: jest.Mock): S3UploadService {
  return { uploadFile } as unknown as S3UploadService;
}

function makeFile(name = "file.txt") {
  return new File(["content"], name);
}

describe("UploadQueueManager auto-retry", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("auto-retries a 'failed to fetch' error and completes on the next attempt", async () => {
    let attempt = 0;
    const uploadFile = jest.fn().mockImplementation(async () => {
      attempt++;
      if (attempt < 2) {
        return { upload: {}, result: Promise.reject(new TypeError("Failed to fetch")) };
      }
      return { upload: {}, result: Promise.resolve({ key: "k" }) };
    });

    const manager = new UploadQueueManager(1);
    manager.add([makeFile()], "", scope, fakeService(uploadFile));

    await jest.advanceTimersByTimeAsync(0);
    expect(manager.getAll()[0].status).toBe("error");

    await jest.advanceTimersByTimeAsync(2000); // backoff before retry #1
    expect(manager.getAll()[0].status).toBe("completed");
    expect(attempt).toBe(2);
  });

  it("gives up after the max auto-retries and stays in error state", async () => {
    const uploadFile = jest
      .fn()
      .mockResolvedValue({ upload: {}, result: Promise.reject(new TypeError("Failed to fetch")) });

    const manager = new UploadQueueManager(1);
    manager.add([makeFile()], "", scope, fakeService(uploadFile));

    await jest.advanceTimersByTimeAsync(0);
    await jest.advanceTimersByTimeAsync(2000);
    await jest.advanceTimersByTimeAsync(4000);
    await jest.advanceTimersByTimeAsync(6000);

    expect(manager.getAll()[0].status).toBe("error");
    expect(uploadFile).toHaveBeenCalledTimes(4); // initial attempt + 3 retries
  });

  it("does not auto-retry non-network errors", async () => {
    const uploadFile = jest
      .fn()
      .mockResolvedValue({ upload: {}, result: Promise.reject(new Error("Access Denied")) });

    const manager = new UploadQueueManager(1);
    manager.add([makeFile()], "", scope, fakeService(uploadFile));

    await jest.advanceTimersByTimeAsync(10000);

    expect(manager.getAll()[0].status).toBe("error");
    expect(uploadFile).toHaveBeenCalledTimes(1);
  });
});
