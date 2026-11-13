import { registerOTel } from "@vercel/otel";

const dataProxy = process.env.NEXT_PUBLIC_S3_ENDPOINT;

export function register() {
  registerOTel({
    serviceName: "source-coop",
    instrumentationConfig: {
      fetch: {
        // Trace context goes to the data proxy, which logs the trace ID and
        // passes it on to /api/v1 (data.source.coop ADR-016), so one ID spans
        // a page, its proxy calls and the API lookups those make. It is never
        // sent to third parties such as Ory or AWS.
        propagateContextUrls: dataProxy
          ? [`${dataProxy.replace(/\/$/, "")}/`]
          : [],
      },
    },
  });
}
