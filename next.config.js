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
      {
        source: "/self-service/:path*",
        destination: "http://localhost:4000/self-service/:path*",
      },
      {
        source: "/sessions/:path*",
        destination: "http://localhost:4000/sessions/:path*",
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
