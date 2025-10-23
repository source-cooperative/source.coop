import { render, screen } from "@testing-library/react";
import { Theme } from "@radix-ui/themes";
import { GlobalUploadNotification } from "../GlobalUploadNotification";

// Mock the upload manager hook
jest.mock("../UploadProvider", () => ({
  useUploadManager: () => ({
    uploads: [
      {
        id: "1",
        file: new File(["test"], "test.txt"),
        key: "test.txt",
        uploadedBytes: 0,
        totalBytes: 100,
        status: "queued",
        scope: { accountId: "test", productId: "test" },
      },
      {
        id: "2",
        file: new File(["test2"], "test2.txt"),
        key: "test2.txt",
        uploadedBytes: 50,
        totalBytes: 100,
        status: "uploading",
        scope: { accountId: "test", productId: "test" },
      },
    ],
    cancelUpload: jest.fn(),
    retryUpload: jest.fn(),
    clearUploads: jest.fn(),
    getUploadsByScope: () => new Map([["test:test", []]]),
  }),
}));

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <Theme>
    {children}
  </Theme>
);

describe("GlobalUploadNotification", () => {
  it("renders when there are active uploads", () => {
    render(
      <TestWrapper>
        <GlobalUploadNotification />
      </TestWrapper>
    );

    expect(screen.getByText("Uploads (2)")).toBeInTheDocument();
    expect(screen.getByText("test.txt")).toBeInTheDocument();
    expect(screen.getByText("test2.txt")).toBeInTheDocument();
  });

  it("shows upload status badges", () => {
    render(
      <TestWrapper>
        <GlobalUploadNotification />
      </TestWrapper>
    );

    expect(screen.getByText("queued")).toBeInTheDocument();
    expect(screen.getByText("uploading")).toBeInTheDocument();
  });

  it("shows progress for uploading files", () => {
    render(
      <TestWrapper>
        <GlobalUploadNotification />
      </TestWrapper>
    );

    // Check for progress bar (uploading file should have progress)
    const progressBars = screen.getAllByRole("progressbar");
    expect(progressBars).toHaveLength(1); // Only uploading file should have progress
  });

  it("does not render when there are no active uploads", () => {
    // Mock with no active uploads
    jest.mocked(require("../UploadProvider").useUploadManager).mockReturnValue({
      uploads: [
        {
          id: "1",
          file: new File(["test"], "test.txt"),
          key: "test.txt",
          uploadedBytes: 100,
          totalBytes: 100,
          status: "completed",
          scope: { accountId: "test", productId: "test" },
        },
      ],
      cancelUpload: jest.fn(),
      retryUpload: jest.fn(),
      clearUploads: jest.fn(),
      getUploadsByScope: () => new Map(),
    });

    const { container } = render(
      <TestWrapper>
        <GlobalUploadNotification />
      </TestWrapper>
    );

    expect(container.firstChild).toBeNull();
  });
});
