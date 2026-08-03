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
    // ponytail: un-hashed filenames under public/, so `immutable` is unsafe —
    // a redeploy has to be able to replace these in place. An hour of freshness
    // drops the per-navigation revalidation round-trip without stranding a
    // stale asset for long.
    const staticAssets = [
      {
        source: "/:dir(img|logo)/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=3600, stale-while-revalidate=604800",
          },
        ],
      },
    ];
    if (process.env.STAGE === "prod") {
      return staticAssets;
    }
    return [
      ...staticAssets,
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
