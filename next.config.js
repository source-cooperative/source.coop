/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  trailingSlash: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*",
        port: "",
        pathname: "/**",
      },
    ],
    domains: ["localhost"],
  },
  env: {
    STORAGE_ENDPOINT: process.env.STORAGE_ENDPOINT,
    AWS_REGION: process.env.AWS_REGION,
  },
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  transpilePackages: ["jose"],
  serverExternalPackages: ["@duckdb/node-api"],
  async headers() {
    // Read-only API routes other Source Cooperative sites call from the
    // browser (e.g. the docs policy wizards checking that an account or
    // product exists). Anonymous access only: without
    // Access-Control-Allow-Credentials the browser sends no cookies and
    // refuses to expose a response to credentialed requests, so this grants
    // cross-origin readers exactly what an unauthenticated curl already gets.
    // Non-simple methods still fail their preflight — no OPTIONS handler.
    const corsHeaders = [
      {
        source: "/api/v1/accounts/:account_id",
        headers: [{ key: "Access-Control-Allow-Origin", value: "*" }],
      },
      {
        source: "/api/v1/products/:account_id",
        headers: [{ key: "Access-Control-Allow-Origin", value: "*" }],
      },
      {
        source: "/api/v1/products/:account_id/:product_id",
        headers: [{ key: "Access-Control-Allow-Origin", value: "*" }],
      },
    ];

    if (process.env.STAGE === "prod") {
      return corsHeaders;
    }
    return [
      ...corsHeaders,
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Robots-Tag",
            value: "noindex, nofollow",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
