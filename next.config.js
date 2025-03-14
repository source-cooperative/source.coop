/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  trailingSlash: false,
  async rewrites() {
    return [
      {
        source: "/auth/:path*",
        destination: "https://*",
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*",
        port: "",
        pathname: "/**",
      },
    ],
    domains: ['localhost'],
  },
  env: {
    STORAGE_TYPE: process.env.STORAGE_TYPE,
    STORAGE_ENDPOINT: process.env.STORAGE_ENDPOINT,
    AWS_REGION: process.env.AWS_REGION,
  },
};

module.exports = nextConfig;
