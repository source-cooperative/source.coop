import { NextApiRequest, NextApiResponse } from "next";
import { StatusCodes } from "http-status-codes";
import {
  BadRequestError,
  MethodNotImplementedError,
  NotFoundError,
  UnauthorizedError,
} from "@/api/errors";
import logger from "@/utils/logger";
import { ZodError } from "zod";

type ApiHandler = (req: NextApiRequest, res: NextApiResponse) => Promise<void>;

export function withErrorHandling(handler: ApiHandler): ApiHandler {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (e) {
      if (e instanceof NotFoundError) {
        return res.status(StatusCodes.NOT_FOUND).json({
          code: StatusCodes.NOT_FOUND,
          message: e.message,
        });
      } else if (e instanceof UnauthorizedError) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
          code: StatusCodes.UNAUTHORIZED,
          message: e.message,
        });
      } else if (e instanceof ZodError) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          code: StatusCodes.BAD_REQUEST,
          message: "Validation error",
          errors: e.errors,
        });
      } else if (e instanceof MethodNotImplementedError) {
        return res.status(StatusCodes.NOT_IMPLEMENTED).json({
          code: StatusCodes.NOT_IMPLEMENTED,
          message: e.message,
        });
      } else if (e instanceof BadRequestError) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          code: StatusCodes.BAD_REQUEST,
          message: e.message,
        });
      }

      logger.error(e);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        code: StatusCodes.INTERNAL_SERVER_ERROR,
        message: "Internal server error",
      });
    }
  };
}
