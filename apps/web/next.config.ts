import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@study-os/contracts"],
  async redirects() {
    return [{ source: "/", destination: "/zh-CN", permanent: false }];
  },
};

export default nextConfig;
