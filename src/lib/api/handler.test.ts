/** @jest-environment node */
import { NextRequest } from "next/server";
import { z } from "zod";
import { getApiSession } from "./utils";
import { toResponse, withApiSession } from "./handler";
import { PROBLEM_CONTENT_TYPE } from "./problems";
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
  ])("maps a %j failure to a %i problem", async (result, status) => {
    const res = toResponse(result);
    expect(res.status).toBe(status);
    expect(res.headers.get("content-type")).toBe(PROBLEM_CONTENT_TYPE);
    await expect(res.json()).resolves.toMatchObject({
      type: `/api/problems/${result.error}`,
      title: expect.any(String),
      status,
      detail: result.message,
      code: result.error,
    });
  });

  it("points at each invalid body field", async () => {
    const schema = z.object({ a: z.string(), b: z.object({ "c/d e": z.number() }) });
    const res = toResponse(fromZodError(schema.safeParse({ b: {} }).error!));
    const body = await res.json();
    expect(body.errors).toEqual([
      { detail: "Required", pointer: "#/a" },
      { detail: "Required", pointer: "#/b/c~1d%20e" },
    ]);
  });

  it("names each invalid query parameter", async () => {
    const res = toResponse(
      fromZodError(z.object({ limit: z.number() }).safeParse({}).error!),
      200,
      "query"
    );
    await expect(res.json()).resolves.toMatchObject({
      errors: [{ detail: "Required", parameter: "limit" }],
    });
  });

  it("leaves out errors when no field is at fault", async () => {
    const body = await toResponse(conflict("Taken")).json();
    expect(body).not.toHaveProperty("errors");
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
    await expect(res.json()).resolves.toMatchObject({ code: "invalid", instance: "http://localhost/api/v1/x" });
    expect(handler).not.toHaveBeenCalled();
  });

  it("adds where a problem happened, and the platform's request ID", async () => {
    handler.mockResolvedValueOnce(toResponse(notFound("Gone")) as never);
    const res = await call({ headers: { "x-vercel-id": "iad1::abc" } });
    expect(res.status).toBe(404);
    expect(res.headers.get("content-type")).toBe(PROBLEM_CONTENT_TYPE);
    await expect(res.json()).resolves.toMatchObject({
      code: "not_found",
      detail: "Gone",
      instance: "http://localhost/api/v1/x",
      request_id: "iad1::abc",
    });
  });

  it("leaves a success alone", async () => {
    handler.mockResolvedValueOnce(toResponse(ok({ a: 1 })) as never);
    await expect((await call()).json()).resolves.toEqual({ a: 1 });
  });

  it("turns a throw into a 500 that reveals nothing", async () => {
    handler.mockRejectedValueOnce(new Error("secret table name"));
    const res = await call();
    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({
      type: "http://localhost/api/problems/internal",
      title: "Internal server error",
      status: 500,
      detail: "Internal server error",
      code: "internal",
      instance: "http://localhost/api/v1/x",
    });
  });
});
