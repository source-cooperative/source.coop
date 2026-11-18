/** @jest-environment node */

jest.mock("@/lib", () => ({
  CONFIG: {
    assets: { region: "us-east-1", bucket: "assets", domain: "assets.example" },
    database: { credentials: undefined },
  },
  LOGGER: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  accountsTable: { fetchById: jest.fn(), update: jest.fn() },
}));

jest.mock("@/lib/api/utils", () => ({ getPageSession: jest.fn() }));
jest.mock("@/lib/api/authz", () => ({ isAuthorized: jest.fn() }));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

const mockSend = jest.fn();
jest.mock("@aws-sdk/client-s3", () => ({
  S3Client: jest.fn(() => ({ send: mockSend })),
  PutObjectCommand: jest.fn((input) => ({ input })),
  DeleteObjectCommand: jest.fn((input) => ({ input })),
}));
jest.mock("@aws-sdk/s3-request-presigner", () => ({ getSignedUrl: jest.fn() }));

import { updateProfileImage, deleteProfileImage } from "./profile-image";
import { getPageSession } from "@/lib/api/utils";
import { isAuthorized } from "@/lib/api/authz";
import { accountsTable } from "@/lib";

function account(profileImage?: string) {
  return {
    account_id: "alice",
    metadata_public: profileImage ? { profile_image: profileImage } : {},
  };
}

function deletedKeys(): string[] {
  return mockSend.mock.calls.map(([cmd]) => cmd.input.Key);
}

beforeEach(() => {
  jest.clearAllMocks();
  (getPageSession as jest.Mock).mockResolvedValue({
    account: { account_id: "alice" },
  });
  (isAuthorized as jest.Mock).mockReturnValue(true);
  (accountsTable.fetchById as jest.Mock).mockResolvedValue(account());
});

describe("updateProfileImage", () => {
  it("stores a key issued for the account", async () => {
    await updateProfileImage("alice", "profile-images/alice/avatar-1700000000000.png");
    expect(accountsTable.update).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata_public: {
          profile_image:
            "https://assets.example/profile-images/alice/avatar-1700000000000.png",
        },
      })
    );
  });

  it.each([
    ["another account's image", "profile-images/bob/avatar-1700000000000.png"],
    ["a path that climbs out", "profile-images/alice/../bob/avatar-1700000000000.png"],
    ["an account whose id extends this one", "profile-images/alice2/avatar-1.png"],
    ["an object outside profile images", "other/thing.png"],
  ])("rejects %s", async (_, key) => {
    await expect(updateProfileImage("alice", key)).rejects.toThrow(/Invalid image key/);
    expect(accountsTable.update).not.toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("deletes the previous image when it belongs to the account", async () => {
    (accountsTable.fetchById as jest.Mock).mockResolvedValue(
      account("https://assets.example/profile-images/alice/avatar-1.png")
    );
    await updateProfileImage("alice", "profile-images/alice/avatar-2.png");
    expect(deletedKeys()).toEqual(["profile-images/alice/avatar-1.png"]);
  });

  it("leaves a stored image that points at another account's object", async () => {
    (accountsTable.fetchById as jest.Mock).mockResolvedValue(
      account("https://assets.example/profile-images/alice/../bob/avatar-1.png")
    );
    await updateProfileImage("alice", "profile-images/alice/avatar-2.png");
    expect(mockSend).not.toHaveBeenCalled();
    expect(accountsTable.update).toHaveBeenCalled();
  });
});

describe("deleteProfileImage", () => {
  it("deletes the account's own image", async () => {
    (accountsTable.fetchById as jest.Mock).mockResolvedValue(
      account("https://assets.example/profile-images/alice/avatar-1.png")
    );
    await deleteProfileImage("alice");
    expect(deletedKeys()).toEqual(["profile-images/alice/avatar-1.png"]);
  });

  it("does not delete another account's object named by the stored image", async () => {
    (accountsTable.fetchById as jest.Mock).mockResolvedValue(
      account("https://assets.example/profile-images/bob/avatar-1.png")
    );
    await deleteProfileImage("alice");
    expect(mockSend).not.toHaveBeenCalled();
  });
});
