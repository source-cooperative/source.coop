/** @jest-environment node */
import { NextRequest } from "next/server";
import { z } from "zod";
import { getApiSession } from "./utils";
import { toResponse, withApiSession } from "./handler";
import {
  conflict,
  forbidden,
  fromZodError,
  notFound,
  ok,
  unauthenticated,
} from "@/lib/operations/result";

jest.mock("./utils", () => ({ getApiSession: jest.fn() }));

const session = { identity_id: "id" };

describe("toResponse", () => {
  it("sends the value with the success status", async () => {
    const res = toResponse(ok({ a: 1 }), 201);
    expect(res.status).toBe(201);
    await expect(res.json()).resolves.toEqual({ a: 1 });  });

  it.each([
    [fromZodError(z.object({ a: z.string() }).safeParse({}).error!), 400],
    [unauthenticated(), 401],
    [forbidden("No"), 403],
    [notFound("Gone"), 404],
    [conflict("Taken"), 409],
  ])("maps a %j failure to %i", async (result, status) => {
    const res = toResponse(result);
    expect(res.status).toBe(status);
    await expect(res.json()).resolves.toEqual({
      error: {
        code: result.error,
        message: result.message,
        field_errors: result.fieldErrors,
      },
    });
  });

  it("names each invalid field", async () => {
    const res = toResponse(fromZodError(z.object({ a: z.string() }).safeParse({}).error!));
    await expect(res.json()).resolves.toMatchObject({
      error: { field_errors: { a: ["Required"] } },
    });
  });
});

describe("withApiSession", () => {
  const handler = jest.fn(async (ctx: object) => Response.json(ctx));
  const route = withApiSession<{ id: string }>(handler as never);
  const call = (init: RequestInit = {}) =>
    route(new NextRequest("http://localhost/api/v1/x", init), {
      params: Promise.resolve({ id: "x" }),
    });

  beforeEach(() => {
    jest.clearAllMocks();
    (getApiSession as jest.Mock).mockResolvedValue(session);
  });

  it("hands the handler the session, params and body", async () => {
    await call({ method: "POST", body: '{"a":1}', headers: { Authorization: "Bearer t" } });
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ session, params: { id: "x" }, body: { a: 1 } })
    );
  });

  it("reads with the cookie session, but changes nothing without a bearer token", async () => {
    await call();
    expect(handler).toHaveBeenLastCalledWith(expect.objectContaining({ session }));
    await call({ method: "POST" });
    expect(handler).toHaveBeenLastCalledWith(
      expect.objectContaining({ session: null, body: undefined })
    );
    expect(getApiSession).toHaveBeenCalledTimes(1);
  });

  it("refuses a body that isn't JSON", async () => {
    const res = await call({ method: "PATCH", body: "{", headers: { Authorization: "Bearer t" } });
    expect(res.status).toBe(400);
    expect(handler).not.toHaveBeenCalled();
  });

  it("turns a throw into a 500 that reveals nothing", async () => {
    handler.mockRejectedValueOnce(new Error("secret table name"));
    const res = await call();
    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({
      error: { code: "internal", message: "Internal server error" },
    });
  });
});
