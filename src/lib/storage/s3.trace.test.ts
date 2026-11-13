/**
 * @jest-environment node
 */
import { ROOT_CONTEXT, context, propagation } from "@opentelemetry/api";
import type { S3Client } from "@aws-sdk/client-s3";
import { S3StorageClient } from "./s3";

const TRACEPARENT = "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01";

describe("S3StorageClient trace context", () => {
  beforeAll(() => {
    propagation.setGlobalPropagator({
      inject: (_ctx, carrier, setter) =>
        setter.set(carrier, "traceparent", TRACEPARENT),
      extract: (ctx) => ctx,
      fields: () => ["traceparent"],
    });
    context.setGlobalContextManager({
      active: () => ROOT_CONTEXT,
      with: (_ctx, fn, thisArg, ...args) => fn.call(thisArg, ...args),
      bind: (_ctx, target) => target,
      enable() {
        return this;
      },
      disable() {
        return this;
      },
    });
  });

  afterAll(() => {
    propagation.disable();
    context.disable();
  });

  test("sends traceparent to the proxy without signing it", async () => {
    const storage = new S3StorageClient({
      endpoint: "https://data.source.coop",
      credentials: {
        accessKeyId: "AKIDEXAMPLE",
        secretAccessKey: "secret",
        sessionToken: "token",
        expiration: "2099-01-01T00:00:00Z",
      },
    });
    let sent: { headers: Record<string, string> } | undefined;
    const { client } = storage as unknown as { client: S3Client };
    client.middlewareStack.addRelativeTo(
      () => async (args) => {
        sent = args.request as { headers: Record<string, string> };
        throw new Error("captured");
      },
      {
        relation: "after",
        toMiddleware: "traceContextMiddleware",
        name: "capture",
      },
    );

    await expect(
      storage.listObjects({ bucket: "account", prefix: "product/" }),
    ).rejects.toThrow("captured");

    expect(sent?.headers.traceparent).toBe(TRACEPARENT);
    const signedHeaders = /SignedHeaders=([^,]+)/.exec(
      sent!.headers.authorization,
    )?.[1];
    expect(signedHeaders).toBeDefined();
    expect(signedHeaders!.split(";")).not.toContain("traceparent");
  });
});
