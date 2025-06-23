import { NextApiRequest } from "next";
import httpMocks from "node-mocks-http";
import { handler } from "@/pages/api/v1/whoami";
import { getSession } from "@/api/utils";
import { UnauthorizedError, MethodNotImplementedError } from "@/api/errors";
import { MockNextApiResponse, jsonBody } from "@/api/utils/mock";

jest.mock("@/api/utils", () => ({
  getSession: jest.fn(),
}));

describe("/api/v1/whoami", () => {
  let req: NextApiRequest;
  let res: MockNextApiResponse;

  beforeEach(() => {
    req = httpMocks.createRequest();
    res = httpMocks.createResponse() as MockNextApiResponse;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should return user session for authenticated GET request", async () => {
    const mockSession = {
      identity_id: "123",
      account: {
        identity_id: "123",
        account_id: "acc456",
        account_type: "INDIVIDUAL",
        disabled: false,
        profile: {
          name: "Test User",
          bio: "A mock user for testing",
          location: "Test Land",
          url: "https://example.com",
        },
        flags: ["BETA_TESTER"],
      },
      memberships: [
        {
          organization_id: "org789",
          role: "MEMBER",
        },
      ],
    };
    (getSession as jest.Mock).mockResolvedValue(mockSession);
    req.method = "GET";

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(jsonBody(res)).toEqual(mockSession);
  });

  it("should throw UnauthorizedError for unauthenticated GET request", async () => {
    (getSession as jest.Mock).mockResolvedValue(null);
    req.method = "GET";

    await expect(handler(req, res)).rejects.toThrow(UnauthorizedError);
  });

  it("should throw MethodNotImplementedError for non-GET requests", async () => {
    req.method = "POST";

    await expect(handler(req, res)).rejects.toThrow(MethodNotImplementedError);
  });
});
