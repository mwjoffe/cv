import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  devIndicators: false,
  turbopack: { root: process.cwd() },
  basePath: "/cv",
  images: { unoptimized: true },
};

export default nextConfig;
