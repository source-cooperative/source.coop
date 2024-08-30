import { NextApiRequest, NextApiResponse } from "next";
import { StatusCodes } from "http-status-codes";
import { withErrorHandling } from "./index";
import {
  BadRequestError,
  MethodNotImplementedError,
  NotFoundError,
  UnauthorizedError,
} from "@/api/errors";
import { ZodError } from "zod";
import logger from "@/utils/logger";

jest.mock("@/utils/logger", () => ({
  error: jest.fn(),
}));

describe("withErrorHandling middleware", () => {
  let mockReq: Partial<NextApiRequest>;
  let mockRes: Partial<NextApiResponse>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    mockReq = {};
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnThis();
    mockRes = {
      json: jsonMock,
      status: statusMock,
    };
  });

  it("should handle successful responses", async () => {
    const handler = jest.fn().mockResolvedValue({ success: true });
    const wrappedHandler = withErrorHandling(handler);

    await wrappedHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    expect(handler).toHaveBeenCalledWith(mockReq, mockRes);
  });

  it("should handle NotFoundError", async () => {
    const handler = jest.fn().mockRejectedValue(new NotFoundError("Not found"));
    const wrappedHandler = withErrorHandling(handler);

    await wrappedHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    expect(statusMock).toHaveBeenCalledWith(StatusCodes.NOT_FOUND);
    expect(jsonMock).toHaveBeenCalledWith({
      code: StatusCodes.NOT_FOUND,
      message: "Not found",
    });
  });

  it("should handle BadRequestError", async () => {
    const handler = jest
      .fn()
      .mockRejectedValue(new BadRequestError("Account already exists"));
    const wrappedHandler = withErrorHandling(handler);

    await wrappedHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    expect(statusMock).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
    expect(jsonMock).toHaveBeenCalledWith({
      code: StatusCodes.BAD_REQUEST,
      message: "Account already exists",
    });
  });

  it("should handle UnauthorizedError", async () => {
    const handler = jest.fn().mockRejectedValue(new UnauthorizedError());
    const wrappedHandler = withErrorHandling(handler);

    await wrappedHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    expect(statusMock).toHaveBeenCalledWith(StatusCodes.UNAUTHORIZED);
    expect(jsonMock).toHaveBeenCalledWith({
      code: StatusCodes.UNAUTHORIZED,
      message: "You are not authorized to perform this action",
    });
  });

  it("should handle ZodError", async () => {
    const zodError = new ZodError([
      {
        code: "invalid_type",
        expected: "string",
        received: "number",
        path: ["field"],
        message: "Expected string, received number",
      },
    ]);
    const handler = jest.fn().mockRejectedValue(zodError);
    const wrappedHandler = withErrorHandling(handler);

    await wrappedHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    expect(statusMock).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
    expect(jsonMock).toHaveBeenCalledWith({
      code: StatusCodes.BAD_REQUEST,
      message: "Validation error",
      errors: zodError.errors,
    });
  });

  it("should handle MethodNotImplementedError", async () => {
    const handler = jest
      .fn()
      .mockRejectedValue(new MethodNotImplementedError());
    const wrappedHandler = withErrorHandling(handler);

    await wrappedHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    expect(statusMock).toHaveBeenCalledWith(StatusCodes.NOT_IMPLEMENTED);
    expect(jsonMock).toHaveBeenCalledWith({
      code: StatusCodes.NOT_IMPLEMENTED,
      message: "Method not implemented",
    });
  });

  it("should handle unknown errors", async () => {
    const handler = jest.fn().mockRejectedValue(new Error("Unknown error"));
    const wrappedHandler = withErrorHandling(handler);

    await wrappedHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    expect(logger.error).toHaveBeenCalled();
    expect(statusMock).toHaveBeenCalledWith(StatusCodes.INTERNAL_SERVER_ERROR);
    expect(jsonMock).toHaveBeenCalledWith({
      code: StatusCodes.INTERNAL_SERVER_ERROR,
      message: "Internal server error",
    });
  });
});
