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
};

export default nextConfig;
